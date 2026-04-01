import path from 'path';
import { inspect } from 'util';

import { type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

const ESLINT_CONFIG_GLOB = [
  '**/eslint.config.js',
  '**/eslint.config.mjs',
  '**/eslint.config.cjs',
];

const CONFIG_FILES_BLOCK = `
  {
    files: ['*.config.js', '.prettierrc.js', 'vitest.config.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },`;

const looksAlreadyPatched = (contents: string): boolean =>
  contents.includes('import-x/no-default-export') &&
  contents.includes('vitest.config.ts') &&
  contents.includes('.prettierrc.js') &&
  contents.includes('*.config.js');

export const hasImportXNoDefaultExportEnabled = (contents: string): boolean =>
  /['"]import-x\/no-default-export['"]\s*:\s*(?:['"](?:error|warn)['"]|\[\s*['"](?:error|warn)['"]|[12](?:\s|,|\]|$))/m.test(
    contents,
  );

const isArrayLiteralNode = (node: SgNode): boolean => node.kind() === 'array';

export const insertImportXConfigFilesOverride = async (
  contents: string,
): Promise<string | null> => {
  if (looksAlreadyPatched(contents)) {
    return null;
  }

  if (!hasImportXNoDefaultExportEnabled(contents)) {
    return null;
  }

  const ast = (await parseAsync('JavaScript', contents)).root();

  const exportMatch = ast.find({
    rule: { pattern: 'export default $ARR' },
  });

  if (!exportMatch) {
    return null;
  }

  const arr = exportMatch.getMatch('ARR');

  if (!arr || !isArrayLiteralNode(arr)) {
    return null;
  }

  const arrayText = arr.text();
  let body = arrayText.slice(0, -1).trimEnd();

  if (!body.endsWith(',')) {
    body = `${body},`;
  }

  const newArray = `${body}${CONFIG_FILES_BLOCK}\n]`;

  return `${ast.commitEdits([arr.replace(newArray)]).trimEnd()}\n`;
};

export const tryAddEslintConfigImportXNoDefaultExport: PatchFunction = async (
  config,
): Promise<PatchReturnType> => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);

  const fileNames = await fg(ESLINT_CONFIG_GLOB, {
    cwd,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/lib/**',
      'src/cli/lint/internalLints/upgrade/patches/**/*',
    ],
  });

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no eslint.config.* file found',
    };
  }

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const updated = await Promise.all(
    files.map(async ({ file, contents }) => ({
      file,
      before: contents,
      after: await insertImportXConfigFilesOverride(contents),
    })),
  );

  const toWrite = updated.filter(
    (row): row is { after: string; before: string; file: string } =>
      row.after !== null && row.after !== row.before,
  );

  if (!toWrite.length) {
    return {
      result: 'skip',
      reason:
        'eslint config already has the override, is not a flat array export, or import-x/no-default-export is not set to error or warn in eslint.config',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    toWrite.map(async ({ file, after }) => {
      await fs.promises.writeFile(file, after);
    }),
  );

  return { result: 'apply' };
};

export const addEslintConfigImportXNoDefaultExport: PatchFunction = async (
  config,
) => {
  try {
    return await tryAddEslintConfigImportXNoDefaultExport(config);
  } catch (err) {
    log.warn(
      'Failed to add import-x/no-default-export override to eslint.config',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
