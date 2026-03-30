import { builtinModules } from 'node:module';
import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction } from '../../index.js';
import { fetchFiles } from '../12.4.1/rewriteSrcImports.js';

const nodeBuiltins = new Set(builtinModules);

const shouldAddExtension = (specifier: string): boolean => {
  // Skip appending .js to node built in modules such as 'fs/promises'
  if (specifier.startsWith('@') || specifier.startsWith('node:')) {
    return false;
  }

  const packageName = specifier.split('/')[0];
  if (packageName && nodeBuiltins.has(packageName)) {
    return false;
  }

  if (path.extname(specifier)) {
    return false;
  }

  return specifier.includes('/');
};

const isDirectory = async (absolutePath: string): Promise<boolean> => {
  try {
    const stats = await fs.promises.stat(absolutePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

export const importSpecifierRegex = /(from\s*)(["'])([^"']+)\2/g; // Matches `from "module"`

const extractSpecifiers = (contents: string): string[] => {
  const results: string[] = [];

  const matches = contents.matchAll(importSpecifierRegex);

  for (const match of matches) {
    const specifier = match[3]; // The regex has 3 capture groups, 1. 'from' keyword, 2. quote, 3. the actual import path

    if (!specifier) {
      continue;
    }

    if (!shouldAddExtension(specifier)) {
      continue;
    }

    results.push(specifier);
  }

  return results;
};

const buildImportPathsWithJsExtensionMap = async (
  specifiers: string[],
  filePath: string,
): Promise<Map<string, string>> => {
  const fileDir = path.dirname(filePath);
  const resolutionMap = new Map<string, string>();

  await Promise.all(
    specifiers.map(async (specifier) => {
      if (specifier.startsWith('.')) {
        const absolutePath = path.resolve(fileDir, specifier);

        if (await isDirectory(absolutePath)) {
          resolutionMap.set(specifier, `${specifier}/index.js`);
          return;
        }
      }

      resolutionMap.set(specifier, `${specifier}.js`);
    }),
  );

  return resolutionMap;
};

export const addJsExtensionForFile = async (
  contents: string,
  filePath: string,
): Promise<string> => {
  const specifiers = extractSpecifiers(contents);

  if (specifiers.length === 0) {
    return contents;
  }

  const resolvedImportPathsWithJsExtension =
    await buildImportPathsWithJsExtensionMap(specifiers, filePath);

  return contents.replace(
    importSpecifierRegex,
    (fullMatch, prefix: string, quote: string, specifier: string) => {
      const resolvedSpecifier =
        resolvedImportPathsWithJsExtension.get(specifier);

      if (!resolvedSpecifier) {
        return fullMatch;
      }

      return `${prefix}${quote}${resolvedSpecifier}${quote}`;
    },
  );
};

export const tryAddJsExtensionToImports: PatchFunction = async (config) => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);

  const fileNames = await fg(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'], {
    cwd,
    dot: true,
    ignore: [
      '**/.git',
      '**/node_modules',
      '**/lib/**',
      'src/cli/lint/internalLints/upgrade/patches/**/*',
    ],
  });

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no source files found',
    };
  }

  const files = await fetchFiles(fileNames.map((file) => path.join(cwd, file)));

  const filesWithChanges = await Promise.all(
    files.map(async ({ file, contents }) => ({
      file,
      before: contents,
      after: await addJsExtensionForFile(contents, file),
    })),
  );

  const hasChanges = filesWithChanges.some(
    ({ before, after }) => before !== after,
  );

  if (!hasChanges) {
    return {
      result: 'skip',
      reason: 'no import specifiers need .js extension',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    filesWithChanges.map(async ({ file, before, after }) => {
      if (before !== after) {
        await fs.promises.writeFile(file, after);
      }
    }),
  );

  return { result: 'apply' };
};

export const addJsExtensionToImports: PatchFunction = async (config) => {
  try {
    return await tryAddJsExtensionToImports(config);
  } catch (err) {
    log.warn('Failed to add .js extension to import specifiers');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
