import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

const resolveEsmSpecifier = (specifier: string): string => {
  if (specifier === '.' || specifier === './') {
    return './index.js';
  }

  const hasSubpath = specifier.startsWith('@')
    ? specifier.split('/').length > 2
    : specifier.includes('/');

  if (hasSubpath && !path.extname(specifier)) {
    return `${specifier}.js`;
  }

  return specifier;
};

const getStatementNode = (match: SgNode, expectedKind: string): SgNode =>
  match.kind() === expectedKind ? match : (match.parent() ?? match);

const migrateConfigFile = (ast: SgNode): Edit[] => {
  const exportDefaultRequire = ast.find({
    rule: { pattern: 'export default require($MOD)' },
  });
  if (exportDefaultRequire) {
    const mod = exportDefaultRequire.getMatch('MOD');
    if (mod) {
      const modText = mod.text();
      const quote = modText.at(0);
      const modulePath = modText.slice(1, -1);
      const stmt = getStatementNode(exportDefaultRequire, 'export_statement');
      return [
        stmt.replace(
          `export { default } from ${quote}${resolveEsmSpecifier(modulePath)}${quote};`,
        ),
      ];
    }
  }

  const moduleExportsRequire = ast.find({
    rule: { pattern: 'module.exports = require($MOD)' },
  });
  if (moduleExportsRequire) {
    const mod = moduleExportsRequire.getMatch('MOD');
    if (mod) {
      const modText = mod.text();
      const quote = modText.at(0);
      const modulePath = modText.slice(1, -1);
      const resolved = resolveEsmSpecifier(modulePath);
      const stmt = getStatementNode(
        moduleExportsRequire,
        'expression_statement',
      );
      return [
        stmt.replace(
          `export { default } from ${quote}${resolved}${quote};`,
        ),
      ];
    }
  }

  const edits: Edit[] = [];

  const requireDecls = ast.findAll({
    rule: {
      any: [
        { pattern: 'const $NAME = require($MOD)' },
        { pattern: 'let $NAME = require($MOD)' },
        { pattern: 'var $NAME = require($MOD)' },
      ],
    },
  });

  for (const match of requireDecls) {
    const name = match.getMatch('NAME');
    const mod = match.getMatch('MOD');
    if (!name || !mod) {
      continue;
    }
    const modText = mod.text();
    const quote = modText.at(0);
    const pkg = modText.slice(1, -1);

    if (name.kind() === 'identifier') {
      edits.push(
        match.replace(`import ${name.text()} from ${quote}${pkg}${quote};\n`),
      );
    } else if (name.kind() === 'object_pattern') {
      const importPattern = name
        .text()
        .replace(/(\w+)\s*:\s*(\w+)/g, '$1 as $2');
      edits.push(
        match.replace(`import ${importPattern} from ${quote}${pkg}${quote};\n`),
      );
    }
  }

  const moduleExports = ast.find({
    rule: { pattern: 'module.exports = $EXPR' },
  });
  if (moduleExports) {
    const expr = moduleExports.getMatch('EXPR');
    if (expr) {
      const stmt = getStatementNode(moduleExports, 'expression_statement');
      edits.push(stmt.replace(`export default ${expr.text()};`));
    }
  }

  return edits;
};

export const tryMigrateEslintConfigExportDefault: PatchFunction = async (
  config,
) => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);

  const fileNames = await fg(
    [
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/.prettierrc.js',
      '**/.prettierrc.cjs',
      '**/.prettierrc.mjs',
    ],
    {
      cwd,
      ignore: [
        '**/node_modules/**',
        '**/.git/**',
        '**/lib/**',
        'src/cli/lint/internalLints/upgrade/patches/**/*',
      ],
    },
  );

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const parsedFiles = await Promise.all(
    files.map(async ({ file, contents }) => {
      const ast = (await parseAsync('JavaScript', contents)).root();
      const edits = migrateConfigFile(ast);
      const updated = edits.length
        ? `${ast.commitEdits(edits).trimEnd()}\n`
        : undefined;
      return { file, updated };
    }),
  );

  const filesWithMigration = parsedFiles.filter(
    (f): f is { file: string; updated: string } => f.updated !== undefined,
  );

  if (!filesWithMigration.length) {
    return {
      result: 'skip',
      reason: 'no config files with module.exports or require found',
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

export const migrateEslintConfigExportDefaultPatch: PatchFunction = async (
  config,
) => {
  try {
    return await tryMigrateEslintConfigExportDefault(config);
  } catch (err) {
    log.warn(
      'Failed to migrate config files (module.exports/require → export default/import)',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
