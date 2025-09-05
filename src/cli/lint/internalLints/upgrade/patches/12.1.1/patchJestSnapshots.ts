import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const JEST_SNAPSHOT_OLD_URL = 'https://goo.gl/fbAQLP';
const JEST_SNAPSHOT_NEW_URL = 'https://jestjs.io/docs/snapshot-testing';

export const patchJestSnapshots = async (
  mode: 'lint' | 'format',
): Promise<PatchReturnType> => {
  const testFilePaths = await fg(['*.test.ts', '*.test.ts.snap'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (testFilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no test files found',
    };
  }

  const testsFiles = await Promise.all(
    testFilePaths.map(async (file) => {
      const contents = await fs.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const testFilesToPatch = testsFiles.filter(({ contents }) =>
    contents.includes(JEST_SNAPSHOT_OLD_URL),
  );

  if (testFilesToPatch.length === 0) {
    return {
      result: 'skip',
      reason: 'no test files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    testFilesToPatch.map(async ({ file, contents }) => {
      const updatedContents = contents.replaceAll(
        JEST_SNAPSHOT_OLD_URL,
        JEST_SNAPSHOT_NEW_URL,
      );
      await fs.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchJestSnapshots: PatchFunction = async ({ mode }) => {
  try {
    return await patchJestSnapshots(mode);
  } catch (err) {
    log.warn('Failed to apply Jest snapshot URL patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
