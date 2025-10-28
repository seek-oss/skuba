import fs from 'fs-extra';
import ignoreFilter from 'ignore';
import git, { findRoot } from 'isomorphic-git';

import { pathExists } from '../../../../src/utils/dir.js';

import {
  ABSENT,
  FILEPATH,
  HEAD,
  MODIFIED,
  STAGE,
  UNMODIFIED,
  WORKDIR,
} from './statusMatrix.js';

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
  const gitRoot = await findRoot({ fs, filepath: dir });
  const [allFiles, isLfs] = await Promise.all([
    git.statusMatrix({ fs, dir: gitRoot ?? dir }),
    createIsLfsFilter(gitRoot),
  ]);

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
        ) && !isLfs(changedFile.path),
    );
};

const createIsLfsFilter = async (
  gitRoot: string | null,
): Promise<(pathname: string) => boolean> => {
  if (!gitRoot) {
    return () => false;
  }

  const lfsFile = `${gitRoot}/.gitattributes`;
  if (!(await pathExists(lfsFile))) {
    return () => false;
  }

  const filter = ignoreFilter().add(
    (await fs.readFile(lfsFile, 'utf8'))
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => !l.startsWith('#') && l.includes('filter=lfs'))
      .map((l) => l.split(/\s+/)[0])
      .flatMap((l) => (l ? [l] : [])),
  );

  return (pathname) => filter.ignores(pathname);
};
