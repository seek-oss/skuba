import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const pnpmInstallProdTestRegex = /^RUN (CI=true )?pnpm install.*--prod/m;
const pnpmInstallProdReplaceRegex = /^RUN (CI=true )?pnpm install.*--prod/gm;

export const patchDockerfilePruneProd = async (
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
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const dockerfilesToPatch = dockerfiles.filter(({ contents }) =>
    pnpmInstallProdTestRegex.test(contents),
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
        pnpmInstallProdReplaceRegex,
        'RUN pnpm prune --prod',
      );
      await fs.promises.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchDockerfilePruneProd: PatchFunction = async ({ mode }) => {
  try {
    return await patchDockerfilePruneProd(mode);
  } catch (err) {
    log.warn('Failed to apply Dockerfile pnpm prune --prod patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
