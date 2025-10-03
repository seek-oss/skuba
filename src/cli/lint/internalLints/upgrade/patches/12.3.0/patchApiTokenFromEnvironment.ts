import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const importRegex =
  /import { apiTokenFromEnvironment } from 'skuba\/lib\/api\/github\/environment';\n/;
const usageRegex = /apiTokenFromEnvironment\(\)/;

export const patchApiTokenFromEnvironment = async (
  mode: 'lint' | 'format',
): Promise<PatchReturnType> => {
  const scriptPaths = await fg(['scripts/**/*.ts'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (scriptPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no scripts found',
    };
  }

  const scripts = await Promise.all(
    scriptPaths.map(async (file) => {
      const contents = await fs.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const scriptsToPatch = scripts.filter(
    ({ contents }) => importRegex.exec(contents) ?? usageRegex.exec(contents),
  );

  if (scriptsToPatch.length === 0) {
    return {
      result: 'skip',
      reason: 'no scripts to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    scriptsToPatch.map(async ({ file, contents }) => {
      const updatedContents = contents
        .replace(importRegex, "import { GitHub } from 'skuba';\n")
        .replace(usageRegex, 'GitHub.apiTokenFromEnvironment()');
      await fs.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchApiTokenFromEnvironment: PatchFunction = async ({
  mode,
}) => {
  try {
    return await patchApiTokenFromEnvironment(mode);
  } catch (err) {
    log.warn('Failed to apply apiTokenFromEnvironment patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
