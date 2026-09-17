import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';

import { type Identity, commit } from './commit.js';
import { findRoot } from './findRoot.js';
import { type ChangedFile, getChangedFiles } from './getChangedFiles.js';

interface CommitAllParameters {
  dir: string;
  message: string;
  author?: Identity;
  committer?: Identity;

  /**
   * File changes to exclude from the commit.
   *
   * Defaults to `[]` (no exclusions).
   */
  ignore?: ChangedFile[];
}

/**
 * Stages all changes and writes a commit to the local Git repository.
 */
export const commitAllChanges = async ({
  dir,
  message,

  author,
  committer,
  ignore,
}: CommitAllParameters): Promise<string | undefined> => {
  const changedFiles = await getChangedFiles({ dir, ignore });

  if (!changedFiles.length) {
    return;
  }

  const gitRoot = await findRoot({ dir });

  if (!gitRoot) {
    throw new Error(`Could not find Git root from directory: ${dir}`);
  }

  await Promise.all(
    changedFiles.map(async (file) => {
      // `file.path` is relative to the Git root, whereas `dir` is relative to
      // the current working directory; resolve both to absolute paths before
      // comparing so the filter holds when `dir` is a subdirectory of the root.
      const relativePath = path.relative(
        path.resolve(dir),
        path.resolve(gitRoot, file.path),
      );

      // Skipping file outside working directory, see https://github.com/seek-oss/skuba/pull/1269#discussion_r1335308704
      if (relativePath.startsWith('..')) {
        return;
      }

      return file.state === 'deleted'
        ? git.remove({
            fs,
            dir: gitRoot,
            filepath: file.path,
          })
        : git.add({
            fs,
            dir: gitRoot,
            filepath: file.path,
          });
    }),
  );

  return commit({
    dir: gitRoot,
    message,
    author,
    committer,
  });
};
