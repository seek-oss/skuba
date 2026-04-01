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
  const isJsonFile = isJsonModuleSpecifier(moduleInfo.modulePath);

  return replaceStatement(
    match,
    'export_statement',
    toReExport({
      quote: moduleInfo.quote,
      modulePath: moduleInfo.modulePath,
      isJsonFile,
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
  const isSkubaEslintConfig = moduleInfo.modulePath.includes(
    'skuba/config/prettier',
  );
  const modulePath = moduleInfo.modulePath + (isSkubaEslintConfig ? '.js' : '');

  return replaceStatement(
    match,
    'expression_statement',
    toReExport({
      quote: moduleInfo.quote,
      modulePath,
      isJsonFile: isJsonModuleSpecifier(modulePath),
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
    const isJsonFile = isJsonModuleSpecifier(modulePath);

    if (name.kind() === 'identifier') {
      edits.push(
        match.replace(
          `import ${name.text()} from ${quote}${modulePath}${quote}${isJsonFile ? ' with { type: "json" }' : ''};\n`,
        ),
      );
      continue;
    }

    // For deconstructed objects
    if (name.kind() === 'object_pattern') {
      const importPattern = name
        .text()
        .replace(/(\w+)\s*:\s*(\w+)/g, '$1 as $2'); // Converts `const { foo, bar: x } = require('fs'); ` to `import { foo, bar as x } from 'fs'; `

      edits.push(
        match.replace(
          `import ${importPattern} from ${quote}${modulePath}${quote}${isJsonFile ? ' with { type: "json" }' : ''};\n`,
        ),
      );
    }
  }

  return edits;
};

// Adds `with { type: "json" }` to existing default `import … from '…json'` (ESM import attributes).
const transformExistingJsonDefaultImport = (ast: SgNode): Edit[] => {
  const imports = ast.findAll({
    rule: { pattern: 'import $NAME from $SPEC' },
  });

  const edits: Edit[] = [];

  for (const match of imports) {
    const specifierNode = match.getMatch('SPEC');
    if (!specifierNode) {
      continue;
    }

    const { modulePath } = extractModuleInfo(specifierNode);

    if (!isJsonModuleSpecifier(modulePath)) {
      continue;
    }

    const importStatement = findImportStatementAncestor(match);
    if (!importStatement) {
      continue;
    }

    const importText = importStatement.text();

    // Skip if it already has an assertion (with { ... } or assert { ... })
    const hasAssertion =
      /\bwith\s*\{/.test(importText) || /\bassert\s*\{/.test(importText);
    if (hasAssertion) {
      continue;
    }

    const cleanedImport = importText.replace(/\s*;\s*$/, '');
    const updatedImport = `${cleanedImport} with { type: "json" };\n`;

    edits.push(importStatement.replace(updatedImport));
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

  const spreadRequires = collectSpreadRequireElements(expr);

  if (spreadRequires.length) {
    return replaceModuleExportsObjectWithSpreadRequires(
      match,
      expr,
      spreadRequires,
    );
  }

  const stmt = getStatementNode(match, 'expression_statement');
  return [stmt.replace(`export default ${expr.text()};`)];
};

const collectSpreadRequireElements = (expr: SgNode): SgNode[] => {
  const requireCalls = expr.findAll({
    rule: { pattern: 'require($MOD)' },
  });

  const spreads: SgNode[] = [];

  for (const call of requireCalls) {
    const parent = call.parent();
    if (parent?.kind() === 'spread_element') {
      spreads.push(parent);
    }
  }

  return spreads;
};

const resolveModulePathForEsmImport = (modulePath: string): string => {
  if (
    modulePath.includes('skuba/config/prettier') &&
    !modulePath.endsWith('.js')
  ) {
    return `${modulePath}.js`;
  }

  return modulePath;
};

const bindingForSpreadResolvedPath = (
  resolved: string,
  index: number,
): string => {
  if (resolved.includes('skuba/config/prettier')) {
    return 'skubaPrettierConfig';
  }

  return `spreadRequire${index}`;
};

const replaceModuleExportsObjectWithSpreadRequires = (
  match: SgNode,
  expr: SgNode,
  spreadRequires: SgNode[],
): Edit[] => {
  const pathToBinding = new Map<string, string>();
  const pathMetadata = new Map<string, { isJson: boolean; quote: string }>();

  const getOrCreateBinding = (resolvedPath: string): string => {
    let binding = pathToBinding.get(resolvedPath);

    if (!binding) {
      binding = bindingForSpreadResolvedPath(resolvedPath, pathToBinding.size);
      pathToBinding.set(resolvedPath, binding);
    }

    return binding;
  };
  const getRequireModule = (spread: SgNode) =>
    spread.find({ rule: { pattern: 'require($MOD)' } })?.getMatch('MOD');

  for (const spread of spreadRequires) {
    const mod = getRequireModule(spread);
    if (!mod) {
      continue;
    }

    const { quote, modulePath } = extractModuleInfo(mod);
    const resolvedPath = resolveModulePathForEsmImport(modulePath);

    if (!pathMetadata.has(resolvedPath)) {
      pathMetadata.set(resolvedPath, {
        isJson: isJsonModuleSpecifier(resolvedPath),
        quote,
      });
    }

    getOrCreateBinding(resolvedPath);
  }

  let objectText = expr.text();

  for (const spread of spreadRequires) {
    const mod = getRequireModule(spread);
    if (!mod) {
      continue;
    }

    const { modulePath } = extractModuleInfo(mod);
    const resolvedPath = resolveModulePathForEsmImport(modulePath);
    const binding = getOrCreateBinding(resolvedPath);

    objectText = objectText.replaceAll(spread.text(), `...${binding}`);
  }

  const importLines = Array.from(pathToBinding.entries())
    .map(([resolvedPath, binding]) => {
      const metadata = pathMetadata.get(resolvedPath);
      if (!metadata) {
        return '';
      }

      const { isJson, quote } = metadata;
      const jsonSuffix = isJson ? ' with { type: "json" }' : '';

      return `import ${binding} from ${quote}${resolvedPath}${quote}${jsonSuffix};`;
    })
    .filter(Boolean)
    .join('\n');

  const statement = getStatementNode(match, 'expression_statement');
  const newBody = `${importLines}\n\nexport default ${objectText};`;

  return [statement.replace(newBody)];
};

const getStatementNode = (match: SgNode, expectedKind: string): SgNode =>
  match.kind() === expectedKind ? match : (match.parent() ?? match);

const isJsonModuleSpecifier = (modulePath: string): boolean =>
  modulePath.endsWith('.json');

const findImportStatementAncestor = (start: SgNode): SgNode | null => {
  let node: SgNode | null = start;
  while (node) {
    const kind = node.kind();
    if (kind === 'import_statement' || kind === 'import_declaration') {
      return node;
    }
    node = node.parent();
  }
  return null;
};

const extractModuleInfo = (mod: SgNode) => {
  const raw = mod.text();
  const quote = raw.at(0) ?? "'";
  const modulePath = raw.slice(1, -1);

  return { raw, quote, modulePath };
};

const resolveParseLanguage = (
  relativePath: string,
): 'JavaScript' | 'TypeScript' =>
  /\.(ts|tsx|mts|cts)$/i.test(relativePath) ? 'TypeScript' : 'JavaScript';

const toReExport = ({
  quote,
  modulePath,
  isJsonFile = false,
}: {
  quote: string;
  modulePath: string;
  isJsonFile?: boolean;
}) =>
  `export { default } from ${quote}${modulePath}${quote}${isJsonFile ? ' with { type: "json" }' : ''};`;

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
    ...transformExistingJsonDefaultImport(ast),
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
      '**/src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}',
    ],
    {
      cwd,
      ignore: [
        '**/node_modules/**',
        '**/.git/**',
        '**/lib/**',
        '**/*.d.ts',
        'src/cli/lint/internalLints/upgrade/patches/**/*',
      ],
    },
  );

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const parsedFiles = await Promise.all(
    files.map(async ({ file, contents }) => {
      const language = resolveParseLanguage(path.relative(cwd, file));
      const ast = (await parseAsync(language, contents)).root();
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
      reason:
        'no config or src files with module.exports, require, or JSON default imports to migrate',
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
