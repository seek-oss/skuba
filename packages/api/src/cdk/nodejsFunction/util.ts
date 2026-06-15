import * as fs from 'node:fs';
import { findPackageJSON } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ValidationError } from './errors.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isInside = (parent: string, child: string): boolean => {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

export const BUNDLE_META_FILENAME = '.lambda-bundle-meta';

export const isEsmFormat = (format: string | undefined): boolean =>
  ['es', 'esm', 'module'].includes(format ?? '');

export const parseJsonFile = (filePath: string): unknown => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new ValidationError(
      `Failed to parse ${filePath} as JSON: ${(err as Error).message}`,
    );
  }
};

export const findUp = (
  name: string,
  directory: string = process.cwd(),
): string | undefined => {
  const absoluteDirectory = path.resolve(directory);

  const file = path.join(absoluteDirectory, name);
  if (fs.existsSync(file)) {
    return file;
  }

  const { root } = path.parse(absoluteDirectory);
  if (absoluteDirectory === root) {
    return undefined;
  }

  return findUp(name, path.dirname(absoluteDirectory));
};

export const extractDependencies = (
  pkgPath: string,
  modules: string[],
): Record<string, string> => {
  const result: Record<string, string> = {};
  const base = pathToFileURL(pkgPath);

  for (const mod of modules) {
    let modPkgPath: string | undefined;
    try {
      modPkgPath = findPackageJSON(mod, base);
    } catch {
      modPkgPath = undefined;
    }

    const parsed: unknown = modPkgPath ? parseJsonFile(modPkgPath) : undefined;
    const version =
      isRecord(parsed) && typeof parsed.version === 'string'
        ? parsed.version.trim()
        : undefined;

    if (!version) {
      throw new ValidationError(
        `Cannot extract version for module '${mod}'. Check that it's referenced in your package.json or installed.`,
      );
    }

    result[mod] = version;
  }

  return result;
};
