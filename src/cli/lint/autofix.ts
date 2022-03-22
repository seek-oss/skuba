import simpleGit from 'simple-git';

import * as Git from '../../api/git';
import { runESLint } from '../../cli/adapter/eslint';
import { runPrettier } from '../../cli/adapter/prettier';
import { isCiEnv } from '../../utils/env';
import { createLogger, log } from '../../utils/logging';

import type { Input } from './types';

const AUTOFIX_COMMIT_MESSAGE = 'Run `skuba format`';

const shouldPush = async (dir: string) => {
  if (!isCiEnv()) {
    // We're not running in a CI environment so we don't need to push autofixes.
    // Ideally we'd drive this off of repository write permissions, but that is
    // non-trivial to infer without attempting an actual write.
    return false;
  }

  try {
    const currentBranch = await Git.currentBranch({ dir });

    const isDefaultBuildkiteBranch =
      currentBranch &&
      [
        process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH,
        'master',
        'main',
      ].includes(currentBranch);

    const isProtectedGitHubBranch = process.env.GITHUB_REF_PROTECTED === 'true';

    if (isDefaultBuildkiteBranch || isProtectedGitHubBranch) {
      // The current branch is a protected branch.
      // We respect GitHub Flow; avoid pushing directly to the default branch.
      return false;
    }
  } catch {}

  try {
    const headCommitMessage = await Git.getHeadCommitMessage({ dir });

    if (headCommitMessage === AUTOFIX_COMMIT_MESSAGE) {
      // Short circuit when the head commit appears to be one of our autofixes.
      // Repeating the same operation is unlikely to correct outstanding issues.
      return false;
    }
  } catch {}

  // Allow the push attempt to go ahead if our guards have been cleared.
  return true;
};

export const autofix = async (input: Pick<Input, 'debug'>): Promise<void> => {
  const dir = process.cwd();

  if (!(await shouldPush(dir))) {
    return;
  }

  // Naively try to autofix issues as we can't tell from ESLint output.
  try {
    log.newline();
    log.warn(`Trying to autofix with ESLint and Prettier...`);

    const logger = createLogger(input.debug);

    await runESLint('format', logger);
    await runPrettier('format', logger);

    const ref = await Git.commitAllChanges({
      dir,
      message: AUTOFIX_COMMIT_MESSAGE,
    });

    if (!ref) {
      return log.warn('No autofixes detected.');
    }

    await (process.env.GITHUB_ACTIONS
      ? // GitHub's checkout action should preconfigure the Git CLI.
        simpleGit().push()
      : // In other CI environments (Buildkite) we fall back to GitHub App auth.
        Git.push({
          auth: { type: 'gitHubApp' },
          dir: process.cwd(),
          ref,
        }));

    log.warn(`Pushed fix commit ${ref}.`);
  } catch (err) {
    log.warn(log.bold('Failed to push fix commit.'));
    log.warn(
      log.bold(
        'Does your CI environment have write access to your Git repository?',
      ),
    );
    log.subtle(err);
  }
};
