import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

// Converts `export default require('some-module')` to `export { default } from 'some-module'`
const transformExportDefaultRequire = (ast: SgNode): Edit[] | null => {
  const match = ast.find({
    rule: { pattern: 'export default require($MOD)' },
  });

  if (!match) {
    return null;
  }

  const mod = match.getMatch('MOD');
  if (!mod) {
    return null;
  }

  const moduleInfo = extractModuleInfo(mod);
  return replaceStatement(
    match,
    'export_statement',
    toReExport({
      quote: moduleInfo.quote,
      modulePath: moduleInfo.modulePath,
    }),
  );
};

// Converts `module.exports = require('some-module')` to `export { default } from 'some-module'`
const transformModuleExportsRequire = (ast: SgNode): Edit[] | null => {
  const match = ast.find({
    rule: { pattern: 'module.exports = require($MOD)' },
  });

  if (!match) {
    return null;
  }

  const mod = match.getMatch('MOD');
  if (!mod) {
    return null;
  }

  const moduleInfo = extractModuleInfo(mod);
  return replaceStatement(
    match,
    'expression_statement',
    toReExport({
      quote: moduleInfo.quote,
      modulePath: moduleInfo.modulePath,
    }),
  );
};

// Converts `const x = require('some-module')` to `import x from 'some-module'`
const transformRequireDeclarations = (ast: SgNode): Edit[] => {
  const matches = ast.findAll({
    rule: {
      any: [
        { pattern: 'const $NAME = require($MOD)' },
        { pattern: 'let $NAME = require($MOD)' },
        { pattern: 'var $NAME = require($MOD)' },
      ],
    },
  });

  const edits: Edit[] = [];

  for (const match of matches) {
    const name = match.getMatch('NAME');
    const mod = match.getMatch('MOD');
    if (!name || !mod) {
      continue;
    }

    const { quote, modulePath } = extractModuleInfo(mod);

    if (name.kind() === 'identifier') {
      const isSkubaEslintConfig = modulePath.includes('eslint-config-skuba');
      edits.push(
        match.replace(
          `import ${name.text()} from ${quote}${modulePath}${quote}${isSkubaEslintConfig ? '.js' : ''};\n`,
        ),
      );
      continue;
    }

    // For deconstructed objects
    if (name.kind() === 'object_pattern') {
      const importPattern = name
        .text()
        .replace(/(\w+)\s*:\s*(\w+)/g, '$1 as $2'); // Converts `const { foo, bar: x} = require('fs');` to `import { foo, bar as x } from 'fs';`

      edits.push(
        match.replace(
          `import ${importPattern} from ${quote}${modulePath}${quote};\n`,
        ),
      );
    }
  }

  return edits;
};

// Converts configs, E.g `module.exports = { ...rules }` to `export default rules`
const transformModuleExports = (ast: SgNode): Edit[] => {
  const match = ast.find({
    rule: { pattern: 'module.exports = $EXPR' },
  });

  if (!match) {
    return [];
  }

  const expr = match.getMatch('EXPR');
  if (!expr) {
    return [];
  }

  const stmt = getStatementNode(match, 'expression_statement');
  return [stmt.replace(`export default ${expr.text()};`)];
};

const getStatementNode = (match: SgNode, expectedKind: string): SgNode =>
  match.kind() === expectedKind ? match : (match.parent() ?? match);

const extractModuleInfo = (mod: SgNode) => {
  const raw = mod.text();
  const quote = raw.at(0) ?? "'";
  const modulePath = raw.slice(1, -1);

  return { raw, quote, modulePath };
};

const toReExport = ({
  quote,
  modulePath,
}: {
  quote: string;
  modulePath: string;
}) => `export { default } from ${quote}${modulePath}${quote};`;

const replaceStatement = (
  match: SgNode,
  expectedKind: string,
  replacement: string,
): Edit[] => {
  const stmt = getStatementNode(match, expectedKind);
  return [stmt.replace(replacement)];
};

const migrateConfigFile = (ast: SgNode): Edit[] =>
  transformExportDefaultRequire(ast) ??
  transformModuleExportsRequire(ast) ?? [
    ...transformRequireDeclarations(ast),
    ...transformModuleExports(ast),
  ];

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
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
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
