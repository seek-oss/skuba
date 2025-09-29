import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const dockerRegex = /FROM \$\{BASE_IMAGE\}(?::\$\{BASE_TAG\})? AS build/;

export const patchDockerfileCIVariable = async (
  mode: 'lint' | 'format',
): Promise<PatchReturnType> => {
  const dockerfilePaths = await fg(['**/Dockerfile*'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (dockerfilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no dockerfiles found',
    };
  }

  const dockerfiles = await Promise.all(
    dockerfilePaths.map(async (file) => {
      const contents = await fs.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const dockerfilesToPatch = dockerfiles.filter(
    ({ contents }) =>
      contents.includes('FROM ${BASE_IMAGE} AS build') ||
      contents.includes('FROM ${BASE_IMAGE}:${BASE_TAG} AS build'),
  );

  if (dockerfilesToPatch.length === 0) {
    return {
      result: 'skip',
      reason: 'no dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    dockerfilesToPatch.map(async ({ file, contents }) => {
      const updatedContents = contents.replace(
        dockerRegex,
        (match) => `${match}\n\nENV CI=true\n`,
      );
      await fs.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchDockerfileCIVariable: PatchFunction = async ({ mode }) => {
  try {
    return await patchDockerfileCIVariable(mode);
  } catch (err) {
    log.warn('Failed to apply Dockerfile CI variable patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
