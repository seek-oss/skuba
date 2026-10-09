import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fs from 'fs-extra';
import * as z from 'zod';

import { globFiles } from '../../../../../../utils/glob.js';
import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

type ImportTarget = string | { [condition: string]: ImportTarget };

type PackageJson = z.infer<typeof packageJsonSchema>;

type ParsedPackageJson = {
  file: string;
  original: PackageJson;
  imports: Record<string, unknown>;
  migratableKeys: Set<string>;
};

const packageJsonSchema = z.looseObject({
  imports: z.record(z.string(), z.unknown()).optional(),
});

const NODE_CONDITIONS = new Set(['default', 'import', 'node', 'require']);

const STRIPPED_EXTENSIONS = new Set(['.js', '.ts']);

const OTHER_TS_EXTENSIONS = new Set(['.cts', '.mts', '.tsx']);

const SPECIFIER_PARENTS = [
  { kind: 'arguments' },
  { kind: 'export_statement' },
  { kind: 'import_require_clause' },
  { kind: 'import_statement' },
  // tree-sitter parses `vi.importActual<typeof import('#a')>('#a')` as
  // `vi.importActual < typeof import('#a') > ('#a')`
  { kind: 'parenthesized_expression', inside: { kind: 'binary_expression' } },
];

const isWildcardKey = (key: string) => /^#[^*]*\/\*$/.test(key);

const isImportTargetObject = (
  target: unknown,
): target is Record<string, unknown> =>
  typeof target === 'object' && target !== null && !Array.isArray(target);

const isExtensionlessTarget = (target: unknown): target is ImportTarget => {
  if (typeof target === 'string') {
    return /^[^*]*\/\*$/.test(target);
  }

  if (isImportTargetObject(target)) {
    const values = Object.values(target);
    return values.length > 0 && values.every(isExtensionlessTarget);
  }

  return false;
};

const mapTargets = (
  target: ImportTarget,
  fn: (target: string, conditions: string[]) => string,
  conditions: string[] = [],
): ImportTarget =>
  typeof target === 'string'
    ? fn(target, conditions)
    : Object.fromEntries(
        Object.entries(target).map(([condition, value]) => [
          condition,
          mapTargets(value, fn, [...conditions, condition]),
        ]),
      );

const toExtensionlessTarget = (target: string, conditions: string[]) => {
  const isSource = conditions.length
    ? conditions.some((condition) => !NODE_CONDITIONS.has(condition))
    : target.split('/').includes('src');

  return `${target}${isSource ? '.ts' : '.js'}`;
};

/**
 * Returns -1 if `a` is more specific than `b`, matching Node.js' `PATTERN_KEY_COMPARE`.
 */
const compareKeySpecificity = (a: string, b: string) => {
  const baseLengthA = a.indexOf('*');
  const baseLengthB = b.indexOf('*');

  if (baseLengthA !== baseLengthB) {
    return baseLengthA > baseLengthB ? -1 : 1;
  }

  return a.length > b.length ? -1 : 1;
};

export const resolveImportKey = (
  specifier: string,
  keys: string[],
): string | undefined => {
  if (!specifier.includes('*') && keys.includes(specifier)) {
    return specifier;
  }

  let bestKey: string | undefined;

  for (const key of keys) {
    const starIndex = key.indexOf('*');

    if (starIndex === -1 || key.lastIndexOf('*') !== starIndex) {
      continue;
    }

    const base = key.slice(0, starIndex);
    const trailer = key.slice(starIndex + 1);

    if (
      specifier.startsWith(base) &&
      specifier.length >= key.length &&
      specifier.endsWith(trailer) &&
      (!bestKey || compareKeySpecificity(key, bestKey) < 0)
    ) {
      bestKey = key;
    }
  }

  return bestKey;
};

const findSpecifiers = (ast: SgNode) =>
  ast.findAll({
    rule: {
      kind: 'string_fragment',
      regex: '^#',
      inside: {
        any: [
          { kind: 'string' },
          {
            kind: 'template_string',
            not: { has: { kind: 'template_substitution' } },
          },
        ],
        inside: { any: SPECIFIER_PARENTS },
      },
    },
  });

const parsePackageJson = async (
  root: string,
  file: string,
): Promise<ParsedPackageJson> => {
  const contents = await fs.promises.readFile(path.join(root, file), 'utf8');

  let original: PackageJson = {};
  try {
    const parsed: unknown = JSON.parse(contents);
    packageJsonSchema.parse(parsed);
    original = parsed as PackageJson;
  } catch (err) {
    log.warn(`Failed to parse ${file}: ${String(err)}`);
  }

  const imports = original.imports ?? {};

  const migratableKeys = new Set(
    Object.entries(imports).flatMap(([key, target]) =>
      isWildcardKey(key) && isExtensionlessTarget(target) ? [key] : [],
    ),
  );

  return { file, original, imports, migratableKeys };
};

const findOwner = (
  dir: string,
  packageJsons: Map<string, ParsedPackageJson>,
): ParsedPackageJson | undefined => {
  const packageJson = packageJsons.get(dir);

  if (packageJson) {
    return packageJson;
  }

  const parent = path.dirname(dir);

  return parent === dir ? undefined : findOwner(parent, packageJsons);
};

const migrateImports = (
  imports: Record<string, unknown>,
  migratableKeys: Set<string>,
  extensions: Map<string, Set<string>> | undefined,
): Record<string, unknown> => {
  const migrated: Record<string, unknown> = {};

  for (const [key, target] of Object.entries(imports)) {
    if (!migratableKeys.has(key) || !isExtensionlessTarget(target)) {
      migrated[key] = target;
      continue;
    }

    const prefix = key.slice(0, -1);

    for (const extension of [...(extensions?.get(key) ?? [])].sort()) {
      const extraKey = `${prefix}*${extension}`;

      if (Object.hasOwn(imports, extraKey)) {
        continue;
      }

      migrated[extraKey] = mapTargets(target, (t) => `${t}${extension}`);
    }

    migrated[key] = mapTargets(target, toExtensionlessTarget);
  }

  return migrated;
};

export const migrateSubpathImportExtensions: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const packageJsonFiles = await globFiles('**/package.json', {
    cwd: root,
    exclude: ['**/.git', '**/node_modules'],
  });

  const packageJsons = new Map(
    (
      await Promise.all(
        packageJsonFiles.map((file) => parsePackageJson(root, file)),
      )
    ).map((packageJson) => [path.dirname(packageJson.file), packageJson]),
  );

  if (
    ![...packageJsons.values()].some(
      ({ migratableKeys }) => migratableKeys.size,
    )
  ) {
    return {
      result: 'skip',
      reason: 'no extensionless subpath imports found in package.json',
    };
  }

  const sourceFiles = await globFiles('**/*.{ts,tsx,mts,cts}', {
    cwd: root,
    exclude: ['**/.git', '**/node_modules'],
  });

  const extensionsByPackageJson = new Map<string, Map<string, Set<string>>>();

  const updatedSourceFiles = await Promise.all(
    sourceFiles.map(async (file) => {
      const owner = findOwner(path.dirname(file), packageJsons);

      if (!owner?.migratableKeys.size) {
        return;
      }

      const fullPath = path.join(root, file);
      const contents = await fs.promises.readFile(fullPath, 'utf8');

      if (!/['"`]#/.test(contents)) {
        return;
      }

      const language = file.endsWith('.tsx') ? 'Tsx' : 'TypeScript';
      const ast = (await parseAsync(language, contents)).root();
      const keys = Object.keys(owner.imports);
      const edits: Edit[] = [];

      for (const node of findSpecifiers(ast)) {
        const specifier = node.text();
        const key = resolveImportKey(specifier, keys);

        if (!key || !owner.migratableKeys.has(key)) {
          continue;
        }

        const extension = path.posix.extname(specifier.slice(key.length - 1));

        if (STRIPPED_EXTENSIONS.has(extension)) {
          edits.push(node.replace(specifier.slice(0, -extension.length)));
          continue;
        }

        if (!extension) {
          continue;
        }

        if (OTHER_TS_EXTENSIONS.has(extension)) {
          if (mode === 'format') {
            log.warn(
              `${file} imports ${specifier}, which will no longer resolve. Remove the ${extension} extension manually.`,
            );
          }
          continue;
        }

        const extensionsByKey =
          extensionsByPackageJson.get(owner.file) ??
          new Map<string, Set<string>>();
        extensionsByPackageJson.set(owner.file, extensionsByKey);

        const extensions = extensionsByKey.get(key) ?? new Set<string>();
        extensionsByKey.set(key, extensions);

        extensions.add(extension);
      }

      return edits.length
        ? { file: fullPath, updated: ast.commitEdits(edits) }
        : undefined;
    }),
  );

  const sourceFilesToUpdate = updatedSourceFiles.filter(
    (file) => file !== undefined,
  );

  const packageJsonsToUpdate = [...packageJsons.values()].flatMap(
    ({ file, original, imports, migratableKeys }) => {
      if (!migratableKeys.size) {
        return [];
      }

      const updated = {
        ...original,
        imports: migrateImports(
          imports,
          migratableKeys,
          extensionsByPackageJson.get(file),
        ),
      };

      return JSON.stringify(updated) === JSON.stringify(original)
        ? []
        : [{ file: path.join(root, file), updated }];
    },
  );

  if (!sourceFilesToUpdate.length && !packageJsonsToUpdate.length) {
    return { result: 'skip', reason: 'no changes required' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all([
    ...sourceFilesToUpdate.map(({ file, updated }) =>
      fs.promises.writeFile(file, updated, 'utf8'),
    ),
    ...packageJsonsToUpdate.map(async ({ file, updated }) =>
      fs.promises.writeFile(file, `${JSON.stringify(updated, null, 2)}\n`),
    ),
  ]);

  return { result: 'apply' };
};

export const tryMigrateSubpathImportExtensions: PatchFunction = async (
  config,
) => {
  try {
    return await migrateSubpathImportExtensions(config);
  } catch (err) {
    log.warn('Failed to strip .js and .ts extensions from subpath imports');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
