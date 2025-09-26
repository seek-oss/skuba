import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const dockerSyntaxRegex = /^#\s*syntax=\s*docker\/dockerfile:\S+\n/;

export const patchDockerfileSyntaxDirective = async (
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

  const dockerfilesToPatch = dockerfiles.filter(({ contents }) =>
    dockerSyntaxRegex.test(contents),
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
      const updatedContents = contents.replace(dockerSyntaxRegex, '');
      await fs.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchDockerfileSyntaxDirective: PatchFunction = async ({
  mode,
}) => {
  try {
    return await patchDockerfileSyntaxDirective(mode);
  } catch (err) {
    log.warn('Failed to apply Dockerfile syntax directive patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
