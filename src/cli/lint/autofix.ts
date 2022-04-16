import { inspect } from 'util';

import simpleGit from 'simple-git';

import * as Git from '../../api/git';
import { runESLint } from '../../cli/adapter/eslint';
import { runPrettier } from '../../cli/adapter/prettier';
import { isCiEnv } from '../../utils/env';
import { createLogger, log } from '../../utils/logging';
import { throwOnTimeout } from '../../utils/wait';

import type { Input } from './types';

const AUTOFIX_COMMIT_MESSAGE = 'Run `skuba format`';

const shouldPush = async ({
  currentBranch,
  dir,
}: {
  currentBranch?: string;
  dir: string;
}) => {
  if (!isCiEnv()) {
    // We're not running in a CI environment so we don't need to push autofixes.
    // Ideally we'd drive this off of repository write permissions, but that is
    // non-trivial to infer without attempting an actual write.
    return false;
  }

  const isDefaultBuildkiteBranch =
    currentBranch &&
    [process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH, 'master', 'main'].includes(
      currentBranch,
    );

  const isProtectedGitHubBranch = process.env.GITHUB_REF_PROTECTED === 'true';

  if (isDefaultBuildkiteBranch || isProtectedGitHubBranch) {
    // The current branch is a protected branch.
    // We respect GitHub Flow; avoid pushing directly to the default branch.
    return false;
  }

  let headCommitMessage;
  try {
    headCommitMessage = await Git.getHeadCommitMessage({ dir });
  } catch {}

  if (headCommitMessage === AUTOFIX_COMMIT_MESSAGE) {
    // Short circuit when the head commit appears to be one of our autofixes.
    // Repeating the same operation is unlikely to correct outstanding issues.
    return false;
  }

  // Allow the push attempt to go ahead if our guards have been cleared.
  return true;
};

interface AutofixParameters {
  debug: Input['debug'];

  eslint: boolean;
  prettier: boolean;
}

export const autofix = async (params: AutofixParameters): Promise<void> => {
  if (!params.eslint && !params.prettier) {
    return;
  }

  const dir = process.cwd();

  let currentBranch;
  try {
    currentBranch = await Git.currentBranch({ dir });
  } catch {}

  if (!(await shouldPush({ currentBranch, dir }))) {
    return;
  }

  try {
    log.newline();
    log.warn(
      `Trying to autofix with ${params.eslint ? 'ESLint and ' : ''}Prettier...`,
    );

    const logger = createLogger(params.debug);

    if (params.eslint) {
      await runESLint('format', logger);
    }
    // Unconditionally re-run Prettier; reaching here means we have pre-existing
    // format violations or may have created new ones through ESLint fixes.
    await runPrettier('format', logger);

    const ref = await Git.commitAllChanges({
      dir,
      message: AUTOFIX_COMMIT_MESSAGE,
    });

    if (!ref) {
      return log.warn('No autofixes detected.');
    }

    await throwOnTimeout<unknown>(
      process.env.GITHUB_ACTIONS
        ? // GitHub's checkout action should preconfigure the Git CLI.
          simpleGit().push()
        : // In other CI environments (Buildkite) we fall back to GitHub App auth.
          Git.push({
            auth: { type: 'gitHubApp' },
            dir: process.cwd(),
            ref,
            remoteRef: currentBranch,
          }),
      { s: 30 },
    );

    log.warn(`Pushed fix commit ${ref}.`);
  } catch (err) {
    log.warn(log.bold('Failed to push fix commit.'));
    log.warn(
      log.bold(
        'Does your CI environment have write access to your Git repository?',
      ),
    );
    log.subtle(inspect(err));
  }
};
