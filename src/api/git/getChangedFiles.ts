import fs from 'fs-extra';
import git from 'isomorphic-git';

import { findRoot } from './findRoot';
import {
  ABSENT,
  FILEPATH,
  HEAD,
  MODIFIED,
  STAGE,
  UNMODIFIED,
  WORKDIR,
} from './statusMatrix';

type ChangedFileState = 'added' | 'modified' | 'deleted';
export interface ChangedFile {
  path: string;
  state: ChangedFileState;
}

export interface IgnoredFile extends ChangedFile {
  /**
   * Optional validation rule to apply to the file.
   * @param file - The file to validate.
   * @returns boolean - Whether the file should be ignored.
   */
  rule?: (params: { file: ChangedFile; gitRoot: string }) => Promise<boolean>;
}

interface ChangedFilesParameters {
  dir: string;

  /**
   * File changes to exclude from the result.
   *
   * Defaults to `[]` (no exclusions).
   */
  ignore?: IgnoredFile[];
}

const mapState = (
  row: [string, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3],
): ChangedFileState => {
  if (row[HEAD] === ABSENT) {
    return 'added';
  }

  if (row[WORKDIR] === MODIFIED) {
    return 'modified';
  }

  return 'deleted';
};

/**
 * Returns all the files which have been added, modified or deleted in the
 * working directory of the local Git repository since the last commit.
 */
export const getChangedFiles = async ({
  dir,

  ignore = [],
}: ChangedFilesParameters): Promise<ChangedFile[]> => {
  const gitRoot = await findRoot({ dir });

  if (!gitRoot) {
    throw new Error(`Could not find Git root from directory: ${dir}`);
  }
  const allFiles = await git.statusMatrix({ fs, dir });
  return allFiles
    .filter(
      (row) =>
        row[HEAD] !== UNMODIFIED ||
        row[WORKDIR] !== UNMODIFIED ||
        row[STAGE] !== UNMODIFIED,
    )
    .map((row) => ({ path: row[FILEPATH], state: mapState(row) }))
    .filter(
      (changedFile) =>
        !ignore.some(
          (i) =>
            i.path === changedFile.path &&
            i.state === changedFile.state &&
            i.rule?.({ gitRoot, file: changedFile }),
        ),
    );
};
