import { inspect } from 'util';

import { glob } from 'node:fs/promises';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const pnpmInstallTestRegex = /^RUN pnpm install.*--prod/m;
const pnpmInstallReplaceRegex = /^RUN pnpm install.*--prod/gm;

export const patchDockerfileCIVariable = async (
  mode: 'lint' | 'format',
): Promise<PatchReturnType> => {
  const dockerfilePaths = await Array.fromAsync(
    glob('**/Dockerfile*', {
      exclude: ['**/.git', '**/node_modules'],
    }),
  );

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

  const dockerfilesToPatch = dockerfiles.filter(({ contents }) =>
    pnpmInstallTestRegex.test(contents),
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
        pnpmInstallReplaceRegex,
        (match) => match.replace('RUN pnpm', 'RUN CI=true pnpm'),
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
