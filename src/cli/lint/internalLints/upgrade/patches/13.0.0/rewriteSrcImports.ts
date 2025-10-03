import path from 'path';
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
  /import\s+['"](?:skuba-dive\/register)(?:\.js)?['"];?\s*/gm;

export const hasRelativeRegisterImportRegex =
  /import\s+['"](\.\.?\/.*?register)(?:\.js)?['"];?\s*/gm;

export const hasRelativeImportRegex =
  /import\s+['"](\.\.?\/[^'"]*?)(?:\.js)?['"];?\s*/gm;

export const hasSrcImportRegex =
  /import\s+(?:type\s+\{[^}]*\}|\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"]src\/[^'"]*['"]/gm;

export const hasImportRegex = /import\(\s*["']src\/[^'"]*["']\s*\)/gm;

export const hasJestMockRegex = /jest\.mock\(\s*["']src\/[^'"]*["']/gm;

const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;

const singleLineCommentRegex = /\/\/.*$/gm;

const whitespaceRegex = /\s/g;

const removeSkubaDiveRegisterImport = (contents: string) =>
  contents.replace(hasSkubaDiveRegisterImportRegex, '');

const removeRelativeRegisterImport = (contents: string) =>
  contents.replace(hasRelativeRegisterImportRegex, '');

const removeSelectiveRelativeImports = (
  contents: string,
  file: string,
  deletionSet: Set<string>,
): string =>
  contents.replace(hasRelativeImportRegex, (match, relativePath: string) => {
    if (!relativePath) {
      return match;
    }

    const fileDir = path.dirname(file);
    const resolvedPath = path.resolve(fileDir, relativePath);

    if (path.extname(relativePath)) {
      return deletionSet.has(resolvedPath) ? '' : match;
    }

    const possiblePaths = [`${resolvedPath}.ts`, `${resolvedPath}.js`];
    const shouldRemove = possiblePaths.some((possiblePath) =>
      deletionSet.has(possiblePath),
    );

    return shouldRemove ? '' : match;
  });

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

export const replaceSrcImportWithConditionalRegisterRemoval = (
  contents: string,
  shouldRemoveRelativeRegister: boolean,
) => {
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

  const withoutSkubaDive = removeSkubaDiveRegisterImport(
    withReplacedSrcImports,
  );

  return shouldRemoveRelativeRegister
    ? removeRelativeRegisterImport(withoutSkubaDive)
    : withoutSkubaDive;
};

export const replaceSrcImportWithSelectiveRegisterRemoval = (
  contents: string,
  file: string,
  deletionSet: Set<string>,
) => {
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

  const withoutSkubaDive = removeSkubaDiveRegisterImport(
    withReplacedSrcImports,
  );

  return removeSelectiveRelativeImports(withoutSkubaDive, file, deletionSet);
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

  const filesWithSkubaDiveRemoved = tsFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    afterSkubaDiveRemoval: removeSkubaDiveRegisterImport(
      contents.replace(
        new RegExp(
          [
            hasSrcImportRegex.source,
            hasImportRegex.source,
            hasJestMockRegex.source,
          ].join('|'),
          'gm',
        ),
        (match) => match.replace(/(['"])src\//g, '$1#src/'),
      ),
    ),
  }));

  const filesToDelete = new Set(
    filesWithSkubaDiveRemoved
      .filter(({ afterSkubaDiveRemoval }) => isFileEmpty(afterSkubaDiveRemoval))
      .map(({ file }) => path.resolve(file)),
  );

  const mapped = tsFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    after: replaceSrcImportWithSelectiveRegisterRemoval(
      contents,
      file,
      filesToDelete,
    ),
  }));

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, before, after }) => {
      if (isFileEmpty(after)) {
        await fs.promises.unlink(file);
        return;
      }

      if (before !== after) {
        await fs.promises.writeFile(file, after);
      }
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
