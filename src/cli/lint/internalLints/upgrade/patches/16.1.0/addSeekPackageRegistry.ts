import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import git from 'isomorphic-git';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const SEEK_REGISTRY = '@seek:registry=https://npm.cloudsmith.io/seek/npm/';
const SEEK_ORG = 'SEEK-Jobs';

export const addSeekPackageRegistry: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const remotes = await git.listRemotes({ fs, dir: process.cwd() });
  const originUrl = remotes.find((r) => r.remote === 'origin')?.url;
  const org = originUrl?.match(/github\.com[:/]([^/]+)\//)?.[1];

  if (org !== SEEK_ORG) {
    return {
      result: 'skip',
      reason: 'not a SEEK-Jobs repository',
    };
  }

  const npmrcPaths = await fg(['**/.npmrc'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (npmrcPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no .npmrc files found',
    };
  }

  const npmrcFiles = await Promise.all(
    npmrcPaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');
      return { file, contents };
    }),
  );

  const patchedNpmrcFiles = npmrcFiles
    .filter(({ contents }) => !contents.includes(SEEK_REGISTRY))
    .map(({ file, contents }) => ({
      file,
      contents: `${contents.trimEnd()}\n${SEEK_REGISTRY}\n`,
    }));

  if (patchedNpmrcFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'all .npmrc files already have the SEEK registry',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    patchedNpmrcFiles.map(async ({ file, contents }) => {
      await fs.promises.writeFile(file, contents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryAddSeekPackageRegistry: PatchFunction = async (args) => {
  try {
    return await addSeekPackageRegistry(args);
  } catch (err) {
    log.warn('Failed to add SEEK package registry to .npmrc');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
