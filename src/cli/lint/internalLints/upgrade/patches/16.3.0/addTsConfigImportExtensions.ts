import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const IMPORT_EXTENSION_OPTIONS = [
  'allowImportingTsExtensions',
  'rewriteRelativeImportExtensions',
];

const findObject = (node: SgNode) => node.find({ rule: { kind: 'object' } });

const hasEntries = (object: SgNode) =>
  object.children().some((child) => child.kind() === 'pair');

const renderOptions = (options: string[], indent: string) =>
  options.map((option) => `\n${indent}"${option}": true`).join(',');

// The opening brace is replaced rather than the object rewritten wholesale so
// that existing formatting and comments are preserved.
const insertOptions = (
  object: SgNode,
  options: string[],
  indent: string,
): Edit[] => {
  const brace = object.find({ rule: { pattern: '{' } });

  if (!brace) {
    return [];
  }

  return [
    brace.replace(
      `{${renderOptions(options, indent)}${hasEntries(object) ? ',' : ''}`,
    ),
  ];
};

export const addImportExtensionOptions = (ast: SgNode): Edit[] => {
  const rootObject = findObject(ast);

  if (!rootObject) {
    return [];
  }

  const compilerOptions = ast.find({
    rule: {
      pattern: {
        context: '{"compilerOptions":}',
        selector: 'pair',
      },
    },
  });

  if (!compilerOptions) {
    const brace = rootObject.find({ rule: { pattern: '{' } });

    if (!brace) {
      return [];
    }

    return [
      brace.replace(
        `{
  "compilerOptions": {${renderOptions(IMPORT_EXTENSION_OPTIONS, '    ')}
  }${hasEntries(rootObject) ? ',' : ''}`,
      ),
    ];
  }

  const missingOptions = IMPORT_EXTENSION_OPTIONS.filter(
    (option) => !compilerOptions.find({ rule: { pattern: `"${option}"` } }),
  );

  const compilerOptionsObject = findObject(compilerOptions);

  if (!missingOptions.length || !compilerOptionsObject) {
    return [];
  }

  return insertOptions(compilerOptionsObject, missingOptions, '    ');
};

export const tryAddTsConfigImportExtensions: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsconfigPaths = await fg(['**/tsconfig.json'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (!tsconfigPaths.length) {
    return { result: 'skip', reason: 'no tsconfig.json files found' };
  }

  registerAstGrepLanguages();

  const patched = await Promise.all(
    tsconfigPaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');
      const ast = (await parseAsync('json', contents)).root();
      const edits = addImportExtensionOptions(ast);

      return edits.length ? { file, contents: ast.commitEdits(edits) } : null;
    }),
  );

  const updatedFiles = patched.flatMap((file) => (file ? [file] : []));

  if (!updatedFiles.length) {
    return {
      result: 'skip',
      reason: 'no tsconfig.json import extension changes required',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    updatedFiles.map(({ file, contents }) =>
      fs.promises.writeFile(file, contents, 'utf8'),
    ),
  );

  return { result: 'apply' };
};

export const addTsConfigImportExtensions: PatchFunction = async (config) => {
  try {
    return await tryAddTsConfigImportExtensions(config);
  } catch (err) {
    log.warn(
      'Failed to add `allowImportingTsExtensions` and `rewriteRelativeImportExtensions` to `tsconfig.json`',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
