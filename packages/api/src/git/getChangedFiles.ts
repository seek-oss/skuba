import fs from 'fs-extra';
import ignoreFilter from 'ignore';
import git, { findRoot } from 'isomorphic-git';

import { pathExists } from '../../../../src/utils/fs.js';

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
type ChangedFilesParameters = {
  dir: string;

  /**
   * File changes to exclude from the result.
   *
   * Defaults to `[]` (no exclusions).
   */
  ignore?: ChangedFile[];
} & (
  | {
      /**
       * Compare files changed starting from this Git reference.
       *
       * If omitted, defaults to the parent of `dst`.
       */
      src?: string;

      /**
       * Compare files changed up to this Git reference.
       *
       * If omitted, defaults to the working directory.
       */
      dst: string;
    }
  | { src?: never; dst?: never }
);

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
 * Returns all the files which have been added, modified or deleted.
 *
 * Defaults to file changes in the working directory of the local Git repository
 * since the last commit, but can also look at a specific `dst` reference, or
 * the changes between `src` and `dst` references.
 */
export const getChangedFiles = async ({
  dir,
  src,
  dst,
  ignore = [],
}: ChangedFilesParameters): Promise<ChangedFile[]> => {
  const gitRoot = await findRoot({ fs, filepath: dir });
  const repoDir = gitRoot ?? dir;
  const [allFiles, isLfs] = await Promise.all([
    dst
      ? getChangedFilesFromRefs({ dir: repoDir, src, dst })
      : getChangedFilesInWorkingDirectory(repoDir),
    createIsLfsFilter(gitRoot),
  ]);

  return allFiles.filter(
    (changedFile) =>
      !ignore.some(
        (i) => i.path === changedFile.path && i.state === changedFile.state,
      ) && !isLfs(changedFile.path),
  );
};

const getChangedFilesInWorkingDirectory = async (
  dir: string,
): Promise<ChangedFile[]> => {
  const rows = await git.statusMatrix({ fs, dir });

  return rows
    .filter(
      (row) =>
        row[HEAD] !== UNMODIFIED ||
        row[WORKDIR] !== UNMODIFIED ||
        row[STAGE] !== UNMODIFIED,
    )
    .map((row) => ({ path: row[FILEPATH], state: mapState(row) }));
};

const getChangedFilesFromRefs = async ({
  dir,
  src,
  dst,
}: {
  dir: string;
  src: string | undefined;
  dst: string;
}): Promise<ChangedFile[]> => {
  const dstOid = await git.resolveRef({ fs, dir, ref: dst });

  let ref = src;
  if (!ref) {
    const { commit } = await git.readCommit({ fs, dir, oid: dstOid });
    if (!commit.parent[0]) {
      throw new Error(
        `Failed to determine changed files in Git: src parameter was omitted but dst (${dst}, ${dstOid}) has no parent`,
      );
    }

    ref = `${commit.parent[0]}`;
  }
  const srcOid = await git.resolveRef({ fs, dir, ref });

  const files: ChangedFile[] = [];

  await git.walk({
    fs,
    dir,
    // eslint-disable-next-line new-cap
    trees: [git.TREE({ ref: srcOid }), git.TREE({ ref: dstOid })],
    map: async (filepath, entries) => {
      if (filepath === '.') {
        return;
      }

      const [srcEntry, dstEntry] = entries as unknown as Array<{
        type?: () => Promise<string | void>;
        oid?: () => Promise<string>;
      }>;

      const srcTypePromise = srcEntry?.type?.();
      const dstTypePromise = dstEntry?.type?.();
      const [srcType, dstType] = await Promise.all([
        srcTypePromise,
        dstTypePromise,
      ]);
      if (srcType === 'tree' || dstType === 'tree') {
        return;
      }

      const srcOidPromise = srcEntry?.oid?.();
      const dstOidPromise = dstEntry?.oid?.();

      const [srcEntryOid, dstEntryOid] = await Promise.all([
        srcOidPromise,
        dstOidPromise,
      ]);

      if (!srcEntryOid && dstEntryOid) {
        return files.push({ path: filepath, state: 'added' as const });
      }

      if (srcEntryOid && !dstEntryOid) {
        return files.push({ path: filepath, state: 'deleted' as const });
      }

      if (srcEntryOid !== dstEntryOid) {
        return files.push({ path: filepath, state: 'modified' as const });
      }

      return;
    },
  });

  return files;
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
    (await fs.promises.readFile(lfsFile, 'utf8'))
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => !l.startsWith('#') && l.includes('filter=lfs'))
      .map((l) => l.split(/\s+/)[0])
      .flatMap((l) => (l ? [l] : [])),
  );

  return (pathname) => filter.ignores(pathname);
};
