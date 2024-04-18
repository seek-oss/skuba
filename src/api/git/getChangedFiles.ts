import fs from 'fs-extra';
import git from 'isomorphic-git';

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
interface ChangedFilesParameters {
  dir: string;

  /**
   * File changes to exclude from the result.
   *
   * Defaults to `[]` (no exclusions).
   */
  ignore?: ChangedFile[];
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
          (i) => i.path === changedFile.path && i.state === changedFile.state,
        ),
    );
};
