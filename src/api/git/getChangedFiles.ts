import fs from 'fs-extra';
import git, { findRoot } from 'isomorphic-git';
import picomatch from 'picomatch';

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
  const gitRoot = await findRoot({ fs, filepath: dir });
  const [allFiles, lfsPatterns] = await Promise.all([
    git.statusMatrix({ fs, dir: gitRoot ?? dir }),
    getLfsPatterns(gitRoot),
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
        ) && !lfsPatterns.some((pattern) => pattern(changedFile.path)),
    );
};

const getLfsPatterns = async (
  gitRoot: string | null,
): Promise<picomatch.Matcher[]> => {
  if (!gitRoot) {
    return [];
  }

  const lfsFile = `${gitRoot}/.gitattributes`;
  if (!(await fs.pathExists(lfsFile))) {
    return [];
  }

  const content = await fs.readFile(lfsFile, 'utf8');

  const lfsPatterns: picomatch.Matcher[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts.includes('filter=lfs') && parts[0]) {
        lfsPatterns.push(picomatch(parts[0]));
      }
    }
  }

  return lfsPatterns;
};
