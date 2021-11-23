import fs from 'fs-extra';
import git from 'isomorphic-git';

import {
  ABSENT,
  FILEPATH,
  HEAD,
  STAGE,
  UNCHANGED,
  WORKDIR,
} from './statusMatrix';

export interface ChangedFile {
  path: string;
  deleted: boolean;
}

/**
 * Returns files which have been added, modified or deleted in the working directory since the last commit
 */
export const getChangedFiles = async ({
  dir,
}: {
  dir: string;
}): Promise<ChangedFile[]> => {
  const allFiles = await git.statusMatrix({ fs, dir });
  return allFiles
    .filter(
      (row) =>
        row[HEAD] !== UNCHANGED ||
        row[WORKDIR] !== UNCHANGED ||
        row[STAGE] !== UNCHANGED,
    )
    .map((row) => ({ path: row[FILEPATH], deleted: row[WORKDIR] === ABSENT }));
};
