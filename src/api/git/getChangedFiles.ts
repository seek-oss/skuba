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
 * Returns files which have been added, modified or deleted in the working directory since the last commit
 */
export const getChangedFiles = async ({
  dir,
}: ChangedFilesParameters): Promise<ChangedFile[]> => {
  const allFiles = await git.statusMatrix({ fs, dir });
  return allFiles
    .filter(
      (row) =>
        row[HEAD] !== UNMODIFIED ||
        row[WORKDIR] !== UNMODIFIED ||
        row[STAGE] !== UNMODIFIED,
    )
    .map((row) => ({ path: row[FILEPATH], state: mapState(row) }));
};
