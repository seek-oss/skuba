import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

export const hasSkubaDiveRegisterImportRegex =
  /import\s+['"](?:skuba-dive\/register|\.\.?\/.*?register)(?:\.js)?['"];?\s*/gm;

export const hasSrcImportRegex =
  /import\s+(?:type\s+\{[^}]*\}|\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"]src\/[^'"]*['"]/gm;

export const replaceSrcImport = (contents: string) =>
  contents.replace(hasSrcImportRegex, (match) =>
    match.replace(/(['"])src\//g, '$1#src/'),
  );

const removeSkubaDiveRegisterImport = (contents: string) =>
  contents.replace(hasSkubaDiveRegisterImportRegex, '');

const replaceAllImports = (contents: string) =>
  removeSkubaDiveRegisterImport(replaceSrcImport(contents));

export const tryRewriteSrcImports: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsFileNames = await glob(['**/*.ts', '**/*.test.ts'], {
    ignore: [
      '**/.git',
      '**/node_modules',
      'src/cli/lint/internalLints/upgrade/patches/**/*',
    ],
  });

  if (!tsFileNames.length) {
    return {
      result: 'skip',
      reason: 'no .ts or test.ts files found',
    };
  }

  const tsFiles = await fetchFiles(tsFileNames);

  const mapped = tsFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    after: replaceAllImports(contents),
  }));

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, after }) => {
      await fs.promises.writeFile(file, after);
    }),
  );

  return { result: 'apply' };
};

export const rewriteSrcImports: PatchFunction = async (config) => {
  try {
    return await tryRewriteSrcImports(config);
  } catch (err) {
    log.warn('Failed to rewrite src imports to #src');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
