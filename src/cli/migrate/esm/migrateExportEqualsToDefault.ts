import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';
import { fetchFiles } from '../../lint/internalLints/upgrade/patches/12.4.1/rewriteSrcImports.js';

const transformExportEqualsToDefault = (ast: SgNode): Edit[] => {
  const match = ast.find({
    rule: { pattern: 'export = $EXPR', kind: 'export_statement' },
  });

  if (!match) {
    return [];
  }

  const expr = match.getMatch('EXPR');
  if (!expr) {
    return [];
  }

  return [match.replace(`export default ${expr.text()};`)];
};

export const tryMigrateExportEqualsToDefault: PatchFunction = async (
  config,
) => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);

  const fileNames = await fg(['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'], {
    cwd,
    ignore: [
      '**/.git',
      '**/node_modules',
      '**/lib/**',
      '**/*.d.ts',
      'src/cli/lint/internalLints/upgrade/patches/**/*',
    ],
  });

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no TypeScript source files found',
    };
  }

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const parsedFiles = await Promise.all(
    files.map(async ({ file, contents }) => {
      const ast = (await parseAsync('Typescript', contents)).root();
      const edits = transformExportEqualsToDefault(ast);
      const updated = edits.length
        ? `${ast.commitEdits(edits).trimEnd()}\n`
        : undefined;
      return { file, updated };
    }),
  );

  const filesWithMigration = parsedFiles.filter(
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
  );

  if (!filesWithMigration.length) {
    return {
      result: 'skip',
      reason: 'no export = assignments found to migrate',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesWithMigration.map(async ({ file, updated }) => {
      await fs.promises.writeFile(file, updated);
    }),
  );

  return { result: 'apply' };
};

export const migrateExportEqualsToDefaultPatch: PatchFunction = async (
  config,
) => {
  try {
    return await tryMigrateExportEqualsToDefault(config);
  } catch (err) {
    log.warn('Failed to migrate export = to export default');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
