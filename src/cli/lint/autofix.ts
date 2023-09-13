import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';
import simpleGit from 'simple-git';

import * as Buildkite from '../../api/buildkite';
import * as Git from '../../api/git';
import * as GitHub from '../../api/github';
import { isCiEnv } from '../../utils/env';
import { createLogger, log } from '../../utils/logging';
import { throwOnTimeout } from '../../utils/wait';
import { runESLint } from '../adapter/eslint';
import { runPrettier } from '../adapter/prettier';
import { JEST_SETUP_FILES } from '../configure/addEmptyExports';
import { RENOVATE_CONFIG_FILENAMES } from '../configure/modules/renovate';
import { SERVER_LISTENER_FILENAME } from '../configure/patchServerListener';
import { REFRESHABLE_IGNORE_FILES } from '../configure/refreshIgnoreFiles';

import type { Input } from './types';

const RENOVATE_DEFAULT_PREFIX = 'renovate';

const AUTOFIX_COMMIT_MESSAGE = 'Run `skuba format`';

const AUTOFIX_DELETE_FILES = [
  // Try to delete this SEEK-Jobs/gutenberg automation file that may have been
  // accidentally committed in a prior autofix.
  'Dockerfile-incunabulum',
];

const AUTOFIX_CODEGEN_FILES = new Set<string>([
  ...AUTOFIX_DELETE_FILES,
  ...JEST_SETUP_FILES,
  ...REFRESHABLE_IGNORE_FILES,
  ...RENOVATE_CONFIG_FILENAMES,
  SERVER_LISTENER_FILENAME,
]);

export const AUTOFIX_IGNORE_FILES: Git.ChangedFile[] = [
  {
    path: '.npmrc',
    state: 'added',
  },
  {
    // This file may already exist in version control, but we shouldn't commit
    // further changes as the CI environment may have appended an npm token.
    path: '.npmrc',
    state: 'modified',
  },
  {
    path: 'Dockerfile-incunabulum',
    state: 'added',
  },
];

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

  if (currentBranch?.startsWith(RENOVATE_DEFAULT_PREFIX)) {
    try {
      await GitHub.getPullRequestNumber();
    } catch (error) {
      const warning =
        'An autofix is available, but it was not pushed because an open pull request for this Renovate branch could not be found. If a pull request has since been created, retry the lint step to push the fix.';
      log.warn(warning);
      try {
        await Buildkite.annotate(Buildkite.md.terminal(warning));
      } catch {}

      return false;
    }
  }

  let headCommitMessage;
  try {
    headCommitMessage = await Git.getHeadCommitMessage({ dir });
  } catch {}

  if (headCommitMessage?.includes(AUTOFIX_COMMIT_MESSAGE)) {
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

/**
 * @returns Whether skuba codegenned a file change which should be included in
 * an autofix commit.
 */
const tryCodegen = async (dir: string): Promise<boolean> => {
  try {
    // Try to forcibly remove `AUTOFIX_DELETE_FILES` from source control.
    // These may include outdated configuration files or internal files that
    // were accidentally committed by an autofix.
    await Promise.all(
      AUTOFIX_DELETE_FILES.map((filename) =>
        fs.promises.rm(path.join(dir, filename), { force: true }),
      ),
    );

    // Search codegenned file changes in the local Git working directory.
    // These may include the `AUTOFIX_DELETE_FILES` deleted above or fixups to
    // ignore files and module exports that were run at the start of the
    // `skuba lint` command.
    const changedFiles = await Git.getChangedFiles({
      dir,

      ignore: AUTOFIX_IGNORE_FILES,
    });

    // Determine if a meaningful codegen change
    return changedFiles.some((changedFile) =>
      AUTOFIX_CODEGEN_FILES.has(changedFile.path),
    );
  } catch (err) {
    log.warn(log.bold('Failed to evaluate codegen changes.'));
    log.subtle(inspect(err));

    return false;
  }
};

export const autofix = async (params: AutofixParameters): Promise<void> => {
  const dir = process.cwd();

  const codegen = await tryCodegen(dir);

  if (!params.eslint && !params.prettier && !codegen) {
    return;
  }

  let currentBranch;
  try {
    currentBranch = await Git.currentBranch({ dir });
  } catch {}

  if (!(await shouldPush({ currentBranch, dir }))) {
    return;
  }

  try {
    log.newline();
    if (!params.eslint && !params.prettier) {
      log.warn('Trying to push codegen updates...');
    } else {
      log.warn(
        `Trying to autofix with ${
          params.eslint ? 'ESLint and ' : ''
        }Prettier...`,
      );

      const logger = createLogger(params.debug);

      if (params.eslint) {
        await runESLint('format', logger);
      }
      // Unconditionally re-run Prettier; reaching here means we have pre-existing
      // format violations or may have created new ones through ESLint fixes.
      await runPrettier('format', logger);
    }

    if (process.env.GITHUB_ACTIONS) {
      // GitHub runners have Git installed locally
      const ref = await Git.commitAllChanges({
        dir,
        message: AUTOFIX_COMMIT_MESSAGE,

        ignore: AUTOFIX_IGNORE_FILES,
      });

      if (!ref) {
        return log.warn('No autofixes detected.');
      }

      await throwOnTimeout(simpleGit().push(), { s: 30 });
      log.warn(`Pushed fix commit ${ref}.`);
      return;
    }

    // Other CI Environments, use GitHub API
    if (!currentBranch) {
      log.warn('Could not determine the current branch.');
      log.warn(
        'Please propagate BUILDKITE_BRANCH, GITHUB_HEAD_REF, GITHUB_REF_NAME, or the .git directory to your container.',
      );
      return;
    }

    const ref = await throwOnTimeout(
      GitHub.uploadAllFileChanges({
        branch: currentBranch,
        dir,
        messageHeadline: AUTOFIX_COMMIT_MESSAGE,

        ignore: AUTOFIX_IGNORE_FILES,
      }),
      { s: 30 },
    );

    if (!ref) {
      return log.warn('No autofixes detected.');
    }

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
