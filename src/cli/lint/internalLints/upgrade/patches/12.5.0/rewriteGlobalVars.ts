import { inspect } from 'util';

import { glob } from 'fast-glob';
import { fs } from 'memfs';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

export const hasDirNameRegex = /__dirname\b/;
export const hasFileNameRegex = /__filename\b/;

// TODO: leave a comment doesn't work for this but it's our repos anyways so should be ok
// const __dirname = fileURLToPath(new URL('.', import.meta.url));
// const root = path.resolve(__dirname, '..', '..');

// TODO: is this efficient?
const removeGlobalVars = (contents: string) =>
  contents
    .replace(hasDirNameRegex, 'import.meta.dirname')
    .replace(hasFileNameRegex, 'import.meta.filename');

// TODO: explain why we need these fallbacks
// export function dirname(importMeta: ImportMeta) {
//   const file = filename(importMeta);
//   return file !== '' ? pathDirname(file) : '';
// }

// export function filename(importMeta: ImportMeta) {
//   return importMeta.url ? fileURLToPath(importMeta.url) : '';
// }

export const tryRewriteGlobalVars: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  // Todo: can this be reused from rewriteSrcImports?
  const fileNames = await glob(
    ['**/*.ts', '**/*.test.ts', '**/*.js', '**/*.test.js'],
    {
      ignore: [
        '**/.git',
        '**/node_modules',
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

  const tsFiles = await fetchFiles(fileNames);

  const filesWithGlobalVarsRemoved = tsFiles.map(({ file, contents }) => ({
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
