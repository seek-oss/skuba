import path from 'path';
import { inspect, isDeepStrictEqual } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import { defaults as seekOxfmtConfig } from 'oxc-config-seek/oxfmt';

import { isErrorWithCode } from '../../../../../../utils/error.js';
import { createExec, exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

import * as Git from '@skuba-lib/api/git';

const GLOB_IGNORE = ['**/.git', '**/node_modules'];

const PRETTIER_CONFIG_GLOBS = [
  '**/.prettierrc',
  '**/.prettierrc.json',
  '**/.prettierrc.json5',
  '**/.prettierrc.yml',
  '**/.prettierrc.yaml',
  '**/.prettierrc.js',
  '**/.prettierrc.cjs',
  '**/.prettierrc.mjs',
  '**/.prettierrc.ts',
  '**/.prettierrc.mts',
  '**/.prettierrc.cts',
  '**/.prettierrc.toml',
  '**/prettier.config.js',
  '**/prettier.config.cjs',
  '**/prettier.config.mjs',
  '**/prettier.config.ts',
  '**/prettier.config.mts',
  '**/prettier.config.cts',
];

const PRETTIER_FILENAMES_TO_DELETE = [
  ...PRETTIER_CONFIG_GLOBS.map((pattern) => pattern.replace('**/', '')),
  '.prettierignore',
  '.oxfmtrc.json',
];

const DEFAULT_OXFMT_CONFIG_TS = `import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
});
`;

type ConfigDiff =
  | { key: string; type: 'arraySpread'; extras: unknown[] }
  | { key: string; type: 'value'; value: unknown };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEnabledWithDefaults = (value: unknown): boolean =>
  value === true || (isPlainObject(value) && Object.keys(value).length === 0);

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][\w$]*$/.test(key);

const serializeTsValue = (value: unknown, indentLevel: number): string => {
  const indent = '  '.repeat(indentLevel);
  const nested = '  '.repeat(indentLevel + 1);

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    return `[\n${value
      .map((item) => `${nested}${serializeTsValue(item, indentLevel + 1)},`)
      .join('\n')}\n${indent}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }

    return `{\n${entries
      .map(([key, nestedValue]) => {
        const serializedKey = isIdentifier(key)
          ? key
          : serializeTsValue(key, 0);
        return `${nested}${serializedKey}: ${serializeTsValue(nestedValue, indentLevel + 1)},`;
      })
      .join('\n')}\n${indent}}`;
  }

  return 'undefined';
};

const getArrayExtras = (migrated: unknown[], seek: unknown[]): unknown[] => {
  const seekSet = new Set(seek.map((item) => JSON.stringify(item)));
  return migrated.filter((item) => !seekSet.has(JSON.stringify(item)));
};

export const diffMigratedOxfmtConfig = (
  migrated: Record<string, unknown>,
  seek: Record<string, unknown> = seekOxfmtConfig,
): ConfigDiff[] => {
  const diffs: ConfigDiff[] = [];

  for (const [key, migratedValue] of Object.entries(migrated)) {
    if (key === '$schema' || migratedValue === undefined) {
      continue;
    }

    const seekValue = seek[key];

    if (
      key === 'sortPackageJson' &&
      isEnabledWithDefaults(migratedValue) &&
      isEnabledWithDefaults(seekValue ?? true)
    ) {
      continue;
    }

    if (Array.isArray(migratedValue) && Array.isArray(seekValue)) {
      const extras = getArrayExtras(migratedValue, seekValue);
      if (extras.length === 0) {
        continue;
      }

      diffs.push({ key, type: 'arraySpread', extras });
      continue;
    }

    if (Array.isArray(migratedValue) && seekValue === undefined) {
      if (migratedValue.length === 0) {
        continue;
      }

      diffs.push({ key, type: 'value', value: migratedValue });
      continue;
    }

    if (isDeepStrictEqual(migratedValue, seekValue)) {
      continue;
    }

    diffs.push({ key, type: 'value', value: migratedValue });
  }

  return diffs;
};

export const buildOxfmtConfigTs = (
  migrated: Record<string, unknown>,
  seek: Record<string, unknown> = seekOxfmtConfig,
): string => {
  const diffs = diffMigratedOxfmtConfig(migrated, seek);

  if (diffs.length === 0) {
    return DEFAULT_OXFMT_CONFIG_TS;
  }

  const properties = diffs.map((diff) => {
    if (diff.type === 'arraySpread') {
      const extras = diff.extras
        .map((extra) => `    ${serializeTsValue(extra, 2)},`)
        .join('\n');
      return `  ${diff.key}: [\n    ...oxfmtConfig.${diff.key},\n${extras}\n  ],`;
    }

    return `  ${diff.key}: ${serializeTsValue(diff.value, 1)},`;
  });

  return `import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
${properties.join('\n')}
});
`;
};

const tryUnlink = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (!isErrorWithCode(err, 'ENOENT')) {
      throw err;
    }
  }
};

const hasPackageJsonPrettierKey = (contents: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(contents);
    return isPlainObject(parsed) && parsed.prettier !== undefined;
  } catch {
    return false;
  }
};

const findPrettierConfigDirectories = async (
  root: string,
): Promise<string[]> => {
  const [configFiles, packageJsonFiles] = await Promise.all([
    fg(PRETTIER_CONFIG_GLOBS, {
      cwd: root,
      dot: true,
      ignore: GLOB_IGNORE,
    }),
    fg('**/package.json', {
      cwd: root,
      ignore: GLOB_IGNORE,
    }),
  ]);

  const dirs = new Set(configFiles.map((file) => path.dirname(file)));

  await Promise.all(
    packageJsonFiles.map(async (file) => {
      const contents = await fs.promises.readFile(
        path.join(root, file),
        'utf8',
      );
      if (hasPackageJsonPrettierKey(contents)) {
        dirs.add(path.dirname(file));
      }
    }),
  );

  return [...dirs];
};

const removePrettierConfig = async (dir: string): Promise<void> => {
  await Promise.all(
    PRETTIER_FILENAMES_TO_DELETE.map(async (filename) =>
      tryUnlink(path.join(dir, filename)),
    ),
  );

  const packageJsonPath = path.join(dir, 'package.json');

  let contents: string;
  try {
    contents = await fs.promises.readFile(packageJsonPath, 'utf8');
  } catch (err) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return;
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return;
  }

  if (!isPlainObject(parsed) || parsed.prettier === undefined) {
    return;
  }

  delete parsed.prettier;
  await fs.promises.writeFile(
    packageJsonPath,
    `${JSON.stringify(parsed, null, 2)}\n`,
    'utf8',
  );
};

const migrateDirectory = async (
  root: string,
  relativeDir: string,
): Promise<void> => {
  const absDir = path.join(root, relativeDir);
  const execInDir = createExec({ cwd: absDir, stdio: 'pipe' });

  await execInDir('oxfmt', '--migrate=prettier');

  const migratedPath = path.join(absDir, '.oxfmtrc.json');
  const migratedContents = await fs.promises.readFile(migratedPath, 'utf8');
  const migrated = JSON.parse(migratedContents) as Record<string, unknown>;

  await fs.promises.writeFile(
    path.join(absDir, 'oxfmt.config.ts'),
    buildOxfmtConfigTs(migrated),
    'utf8',
  );

  await removePrettierConfig(absDir);
};

export const migratePrettierToOxfmt: PatchFunction = async ({
  mode,
  packageManager,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const root = (await Git.findRoot({ dir })) ?? dir;
  const prettierDirs = await findPrettierConfigDirectories(root);

  if (prettierDirs.length === 0) {
    return {
      result: 'skip',
      reason: 'no Prettier config files found',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await patchPnpmWorkspace(mode, root);

  if (packageManager.command === 'pnpm') {
    try {
      await exec(
        'pnpm',
        'install',
        '--frozen-lockfile=false',
        '--prefer-offline',
      );
    } catch (error) {
      log.warn('Failed to install dependencies after patching pnpm workspace');
      log.subtle(inspect(error));
    }
  }

  await Promise.all(
    prettierDirs.map(async (relativeDir) =>
      migrateDirectory(root, relativeDir),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryMigratePrettierToOxfmt: PatchFunction = async (config) => {
  try {
    return await migratePrettierToOxfmt(config);
  } catch (err) {
    log.warn('Failed to migrate Prettier to Oxfmt');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
