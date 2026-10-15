import path from 'path';

import * as Git from '@skuba-lib/api/git';

import { createDestinationFileReader } from '../configure/analysis/project.js';

import { isGitHubOrg, isGitHubTeam } from './validation.js';
import { readWorkspaceGlobs } from './workspace.js';

export interface ExistingRepoDefaults {
  /** Absolute path of the workspace root. */
  workspaceRoot: string;
  /** Owner of the existing repository in `org/team` or `org` form. */
  ownerName: string | undefined;
  /** Name of the existing repository that the new project will live inside. */
  repoName: string | undefined;
  /**
   * Directory to nest the new project under, relative to the workspace root.
   *
   * An empty string places the project directly in the workspace root.
   */
  parentDir: string;
}

const CODEOWNERS_PATHS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
];

const CODEOWNER_REGEX = /@([A-Za-z0-9-]+)\/([A-Za-z0-9_-]+)/;

const ownerNameFromCodeowners = async (
  workspaceRoot: string,
): Promise<string | undefined> => {
  const reader = createDestinationFileReader(workspaceRoot);

  const files = await Promise.all(CODEOWNERS_PATHS.map(reader));

  for (const contents of files) {
    const [, org, team] = CODEOWNER_REGEX.exec(contents ?? '') ?? [];

    if (org && team && isGitHubOrg(org) && isGitHubTeam(team)) {
      return `${org}/${team}`;
    }
  }

  return undefined;
};

const toPosix = (filepath: string) => filepath.split(path.sep).join('/');

/**
 * Infers where the repository keeps its workspace projects.
 *
 * The current working directory wins when it sits below the workspace root, as
 * that mirrors the standalone behaviour of scaffolding into the current
 * directory. Otherwise a `<dir>/*` glob from `pnpm-workspace.yaml` points at a
 * location the workspace already covers, so the project does not need a new
 * entry.
 */
const inferParentDir = async (
  workspaceRoot: string,
  cwd: string,
): Promise<string> => {
  const fromCwd = toPosix(path.relative(workspaceRoot, cwd));

  if (fromCwd && !fromCwd.startsWith('..')) {
    return fromCwd;
  }

  const globs = await readWorkspaceGlobs(workspaceRoot);

  const parentDirs = globs.flatMap((glob) => {
    const [, parentDir] = /^([A-Za-z0-9._-]+)\/\*{1,2}$/.exec(glob) ?? [];

    return parentDir ? [parentDir] : [];
  });

  return parentDirs[0] ?? '';
};

/**
 * Gathers sensible prompt defaults for scaffolding into an existing repository.
 *
 * Repository-level details are inherited rather than invented: the new project
 * is a workspace member, so it shares the owner and repository name of the
 * surrounding repo.
 */
export const getExistingRepoDefaults = async ({
  workspaceRoot,
  cwd = process.cwd(),
}: {
  workspaceRoot: string;
  cwd?: string;
}): Promise<ExistingRepoDefaults> => {
  const [ownerAndRepo, codeownersOwnerName, parentDir] = await Promise.all([
    Git.getOwnerAndRepo({ dir: workspaceRoot }).catch(() => undefined),
    ownerNameFromCodeowners(workspaceRoot),
    inferParentDir(workspaceRoot, cwd),
  ]);

  return {
    workspaceRoot,
    ownerName: codeownersOwnerName ?? ownerAndRepo?.owner,
    repoName: ownerAndRepo?.repo ?? path.basename(workspaceRoot),
    parentDir,
  };
};
