import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

import * as Git from '@skuba-lib/api/git';

const SEEK_REGISTRY = '@seek:registry=https://npm.cloudsmith.io/seek/npm/';
const SEEK_ORG = 'SEEK-Jobs';

export const addSeekPackageRegistry: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });

  if (!gitRoot) {
    return { result: 'skip', reason: 'no Git root found' };
  }

  const { owner } = await Git.getOwnerAndRepo({ dir: gitRoot });

  if (owner.toLowerCase() !== SEEK_ORG.toLowerCase()) {
    return {
      result: 'skip',
      reason: 'not a SEEK-Jobs repository',
    };
  }

  const npmrcPaths = await fg(['**/.npmrc'], {
    cwd: gitRoot,
    ignore: ['**/.git', '**/node_modules'],
  });

  if (npmrcPaths.length === 0) {
    if (mode === 'lint') {
      return { result: 'apply' };
    }

    await fs.promises.writeFile(
      path.join(gitRoot, '.npmrc'),
      `${SEEK_REGISTRY}\n`,
      'utf8',
    );
    return { result: 'apply' };
  }

  const npmrcFiles = await Promise.all(
    npmrcPaths.map(async (file) => {
      const fullPath = path.join(gitRoot, file);
      const contents = await fs.promises.readFile(fullPath, 'utf8');
      return { file: fullPath, contents };
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
