import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

export const hasDirNameRegex = /__dirname\b/;
export const hasDirNameVariableRegex = /const __dirname =/g;
export const hasFileNameRegex = /__filename\b/;
export const hasFileNameVariableRegex = /const __filename =/g;

const removeGlobalVars = (contents: string) =>
  contents
    .replace(hasDirNameRegex, 'import.meta.dirname')
    .replace(hasFileNameRegex, 'import.meta.filename')
    .replace(hasDirNameVariableRegex, '')
    .replace(hasFileNameVariableRegex, '');

export const tryRewriteGlobalVars: PatchFunction = async (config) => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);

  const fileNames = await fg(
    ['**/*.ts', '**/*.test.ts', '**/*.js', '**/*.test.js'],
    {
      cwd,
      ignore: [
        '**/.git',
        '**/node_modules',
        '**/lib/**',
        'src/cli/lint/internalLints/upgrade/patches/**/*',
      ],
    },
  );

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no .ts or test.ts files found',
    };
  }

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const filesWithGlobalVarsRemoved = files.map(({ file, contents }) => ({
    file,
    before: contents,
    after: removeGlobalVars(contents),
  }));

  const hasChanges = filesWithGlobalVarsRemoved.some(
    ({ before, after }) => before !== after,
  );

  if (!hasChanges) {
    return {
      result: 'skip',
      reason: 'no global variables found to replace',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesWithGlobalVarsRemoved.map(async ({ file, before, after }) => {
      if (before !== after) {
        await fs.promises.writeFile(file, after);
      }
    }),
  );

  return { result: 'apply' };
};

export const rewriteGlobalVars: PatchFunction = async (config) => {
  try {
    return await tryRewriteGlobalVars(config);
  } catch (err) {
    log.warn('Failed to replace global variables with import.meta equivalents');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
