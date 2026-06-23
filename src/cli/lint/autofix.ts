import { inspect } from 'util';

import fs from 'fs-extra';
import git from 'isomorphic-git';
import { simpleGit } from 'simple-git';

import { isCiEnv } from '../../utils/env.js';
import { createLogger, log } from '../../utils/logging.js';
import { hasNpmrcSecret } from '../../utils/npmrc.js';
import { throwOnTimeout } from '../../utils/wait.js';
import { runESLint } from '../adapter/eslint.js';
import { runPrettier } from '../adapter/prettier.js';
import { createDestinationFileReader } from '../configure/analysis/project.js';

import { internalLint } from './internal.js';
import type { Input } from './types.js';

import * as Buildkite from '@skuba-lib/api/buildkite';
import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

export const RENOVATE_AUTHOR = {
  name: 'renovate[bot]',
  email: '29139614+renovate[bot]@users.noreply.github.com',
};

const RENOVATE_DEFAULT_PREFIX = 'renovate';

const AUTOFIX_COMMIT_MESSAGE = 'Run `skuba format`';

export const AUTOFIX_IGNORE_FILES_BASE: Git.ChangedFile[] = [
  {
    path: 'Dockerfile-incunabulum',
    state: 'added',
  },
];

export const AUTOFIX_IGNORE_FILES_NPMRC: Git.ChangedFile[] = [
  {
    path: '.npmrc',
    state: 'added',
  },
  {
    path: '.npmrc',
    state: 'modified',
  },
];

/**
 * - `renovate-lock-file-maintenance`
 * - `renovate/skuba-9000.x-lockfile`
 */
const LOCKFILE_BRANCH_PATTERN =
  /^renovate[\/-](?:.+-lockfile|lock-file-maintenance)$/;

const isManagedLockfile = (path: string): boolean =>
  path.endsWith('/pnpm-lock.yaml') ||
  path === 'pnpm-lock.yaml' ||
  path.endsWith('/yarn.lock') ||
  path === 'yarn.lock';

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
    } catch {
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

  if (headCommitMessage?.startsWith(AUTOFIX_COMMIT_MESSAGE)) {
    // Short circuit when the head commit appears to be one of our autofixes.
    // Repeating the same operation is unlikely to correct outstanding issues.
    return false;
  }

  // Allow the push attempt to go ahead if our guards have been cleared.
  return true;
};

const createAutofixIgnore = async ({
  currentBranch,
  dir,
}: {
  currentBranch?: string;
  dir: string;
}): Promise<Git.ChangedFile[] | false> => {
  const ignore = await getIgnores(dir);

  const changedFiles = await Git.getChangedFiles({ dir, ignore });

  const lockfileChanges = changedFiles.filter((file) =>
    isManagedLockfile(file.path),
  );

  if (
    lockfileChanges.length &&
    (await isRenovateLockfileUpdate({ currentBranch, dir }))
  ) {
    log.warn(
      'Renovate appears to be performing lock file updates on this branch. The following autofixes have been skipped to avoid an infinite loop:',
    );
    lockfileChanges.forEach((file) => log.subtle(`- ${file.path}`));

    return lockfileChanges.length === changedFiles.length
      ? false
      : [...ignore, ...lockfileChanges];
  }

  return ignore;
};

const isRenovateLockfileUpdateInGit = async (
  dir: string,
): Promise<boolean | null> => {
  const [headResult] = await git.log({ depth: 1, dir, fs });
  if (!headResult) {
    return null;
  }

  // Check whether the head commit was authored by Renovate.
  // This likely isn't perfect when there are timing issues and/or another bot
  // commits over Renovate, but it should be sufficient to catch most cases.
  if (
    headResult.commit.author.name !== RENOVATE_AUTHOR.name ||
    headResult.commit.author.email !== RENOVATE_AUTHOR.email
  ) {
    return false;
  }

  // Check whether the head commit only touched lockfile(s).
  // We're assuming that Renovate will rebase less aggressively when other
  // changes are present given we haven't seen this death spiral in repos that
  // pin `skuba` and hence receive updates to both `package.json` and lockfile.
  // https://github.com/renovatebot/renovate/blob/a0df771195a2911c7bba29d51982c2f763ebdb9e/lib/modules/manager/npm/post-update/index.ts#L662
  const changedFiles = await Git.getChangedFiles({
    dir,
    dst: 'HEAD',
  });
  if (
    changedFiles.length &&
    changedFiles.every((file) => isManagedLockfile(file.path))
  ) {
    return true;
  }

  return false;
};

const isRenovateLockfileUpdate = async ({
  currentBranch,
  dir,
}: {
  currentBranch?: string;
  dir: string;
}): Promise<boolean> => {
  try {
    // Try to inspect head commit via Git first
    const result = await isRenovateLockfileUpdateInGit(dir);

    if (result !== null) {
      return result;
    }
  } catch (err) {
    log.warn(
      'Renovate autofix guard failed to inspect head commit, falling back to branch name match.',
    );
    log.subtle(inspect(err));
  }

  // Fallback to branch name match
  if (currentBranch && LOCKFILE_BRANCH_PATTERN.test(currentBranch)) {
    return true;
  }

  return false;
};

const getIgnores = async (dir: string): Promise<Git.ChangedFile[]> => {
  const contents = await createDestinationFileReader(dir)('.npmrc');

  // If an .npmrc has secrets, we need to ignore it
  if (hasNpmrcSecret(contents ?? '')) {
    return [...AUTOFIX_IGNORE_FILES_BASE, ...AUTOFIX_IGNORE_FILES_NPMRC];
  }

  return AUTOFIX_IGNORE_FILES_BASE;
};

interface AutofixParameters {
  debug: Input['debug'];

  eslint: boolean;
  prettier: boolean;
  internal: boolean;

  eslintConfigFile?: string;
}

export const autofix = async (params: AutofixParameters): Promise<void> => {
  const dir = process.cwd();

  if (!params.eslint && !params.prettier && !params.internal) {
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

    log.warn(
      `Attempting to autofix issues (${[
        params.internal ? 'skuba' : undefined,
        params.internal || params.eslint ? 'ESLint' : undefined,
        'Prettier', // Prettier is always run
      ]
        .filter((s) => s !== undefined)
        .join(', ')})...`,
    );

    const logger = createLogger({ debug: params.debug });

    if (params.internal) {
      await internalLint('format');
    }

    if (params.internal || params.eslint) {
      await runESLint('format', logger, params.eslintConfigFile);
    }

    // Unconditionally re-run Prettier; reaching here means we have pre-existing
    // format violations or may have created new ones through ESLint/internal fixes.
    await runPrettier('format', logger);

    const ignore = await createAutofixIgnore({ currentBranch, dir });
    if (!ignore) {
      return log.warn('No autofixes detected.');
    }

    if (process.env.GITHUB_ACTIONS) {
      // GitHub runners have Git installed locally
      const ref = await Git.commitAllChanges({
        dir,
        message: AUTOFIX_COMMIT_MESSAGE,

        ignore,
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

        ignore,
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
