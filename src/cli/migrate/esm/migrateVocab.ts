import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';

export const migrateVocab: PatchFunction = async ({ mode }) => {
  const vocabFilePaths = await fg(['**/vocab.config.js'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (!vocabFilePaths.length) {
    return {
      result: 'skip',
      reason: 'no vocab.config.js files found',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    vocabFilePaths.map(async (filePath) =>
      fs.promises.rename(filePath, filePath.replace(/\.js$/, '.cjs')),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateVocab: PatchFunction = async (opts) => {
  try {
    return await migrateVocab(opts);
  } catch (err) {
    log.warn('Failed to migrate vocab files, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
