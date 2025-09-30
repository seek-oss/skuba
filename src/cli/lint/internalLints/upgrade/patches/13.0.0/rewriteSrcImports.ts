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

export const hasImportRegex = /import\(\s*["']src\/[^'"]*["']\s*\)/gm;

export const hasJestMockRegex = /jest\.mock\(\s*["']src\/[^'"]*["']\s*\)/gm;

const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;

const singleLineCommentRegex = /\/\/.*$/gm;

const whitespaceRegex = /\s/g;

const removeSkubaDiveRegisterImport = (contents: string) =>
  contents.replace(hasSkubaDiveRegisterImportRegex, '');

export const isFileEmpty = (contents: string): boolean =>
  contents
    .replace(multiLineCommentRegex, '')
    .replace(singleLineCommentRegex, '')
    .replace(whitespaceRegex, '').length === 0;

export const replaceSrcImport = (contents: string) => {
  const combinedSrcRegex = new RegExp(
    [
      hasSrcImportRegex.source,
      hasImportRegex.source,
      hasJestMockRegex.source,
    ].join('|'),
    'gm',
  );

  const withReplacedSrcImports = contents.replace(combinedSrcRegex, (match) =>
    match.replace(/(['"])src\//g, '$1#src/'),
  );

  return removeSkubaDiveRegisterImport(withReplacedSrcImports);
};

export const tryRewriteSrcImports: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsFileNames = await glob(['**/*.ts', '**/*.test.ts'], {
    ignore: ['**/.git', '**/node_modules'],
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
    after: replaceSrcImport(contents),
  }));

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, after }) => {
      if (isFileEmpty(after)) {
        await fs.promises.unlink(file);
        return;
      }

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
