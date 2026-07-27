import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import * as z from 'zod';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const packageJsonSchema = z.looseObject({
  imports: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export type PackageJson = z.infer<typeof packageJsonSchema>;

const SRC_JSON_SUBPATH = '#src/*.json';
const SRC_WILDCARD_SUBPATH = '#src/*';

const normalizeImportCondition = (condition: string) =>
  condition.endsWith('/*') ? condition.slice(0, -2) : condition;

const toJsonImportTarget = (target: string, kind: 'default' | 'source') => {
  if (kind === 'default') {
    if (target === './lib/*' || target === './lib/*.js') {
      return './lib/*.json';
    }

    return target;
  }

  if (target === './src/*' || target === './src/*.ts') {
    return './src/*.json';
  }

  return target;
};

export const deriveSrcJsonSubpathImportsMapping = (
  srcMapping: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(srcMapping).map(([condition, target]) => {
      if (condition === 'default') {
        return [condition, toJsonImportTarget(target, 'default')];
      }

      return [
        normalizeImportCondition(condition),
        toJsonImportTarget(target, 'source'),
      ];
    }),
  );

// Conditions are resolved in order, so the mapping is rebuilt rather than
// mutated in place to keep `default` last.
export const updateSrcSubpathImportsMapping = (
  parsed: PackageJson,
): boolean => {
  const mapping = parsed.imports?.[SRC_WILDCARD_SUBPATH];

  if (!parsed.imports || !mapping) {
    return false;
  }

  const updated = Object.fromEntries(
    Object.entries(mapping).map(([condition, target]) => {
      if (condition === 'default') {
        return [condition, target === './lib/*' ? './lib/*.js' : target];
      }

      const normalizedCondition = normalizeImportCondition(condition);

      if (target !== './src/*' && target !== './src/*.js') {
        return [normalizedCondition, target];
      }

      return [normalizedCondition, './src/*.ts'];
    }),
  );

  if (JSON.stringify(mapping) === JSON.stringify(updated)) {
    return false;
  }

  parsed.imports[SRC_WILDCARD_SUBPATH] = updated;

  return true;
};

export const addSrcJsonSubpathImportsMapping = (
  parsed: PackageJson,
): boolean => {
  const srcMapping = parsed.imports?.[SRC_WILDCARD_SUBPATH];

  if (!parsed.imports || !srcMapping) {
    return false;
  }

  const jsonMapping = deriveSrcJsonSubpathImportsMapping(srcMapping);
  const existingMapping = parsed.imports[SRC_JSON_SUBPATH];

  if (
    existingMapping &&
    JSON.stringify(existingMapping) === JSON.stringify(jsonMapping)
  ) {
    return false;
  }

  parsed.imports[SRC_JSON_SUBPATH] = jsonMapping;

  return true;
};

const parsePackageJson = (
  contents: string,
): { original: PackageJson; parsed: PackageJson } | null => {
  try {
    const parsedJson: unknown = JSON.parse(contents);
    return {
      original: parsedJson as PackageJson,
      parsed: packageJsonSchema.parse(parsedJson),
    };
  } catch (error) {
    log.warn(`Failed to parse package.json as JSON: ${String(error)}`);
    return null;
  }
};

const tryApplyPackageJsonImportPatch = async (
  mode: Parameters<PatchFunction>[0]['mode'],
  updateParsed: (parsed: PackageJson) => boolean,
  skipReason: string,
): Promise<PatchReturnType> => {
  const packageJsonFiles = await fg(['**/package.json'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (!packageJsonFiles.length) {
    return { result: 'skip', reason: 'no package.json files found' };
  }

  const parsedFiles = (
    await Promise.all(
      packageJsonFiles.map(async (file) => {
        const contents = await fs.promises.readFile(file, 'utf8');
        const parsed = parsePackageJson(contents);
        return parsed ? { file, contents, ...parsed } : null;
      }),
    )
  ).flatMap((entry) => (entry ? [entry] : []));

  const updatedFiles = parsedFiles.map(({ file, original, parsed }) => {
    updateParsed(parsed);
    return { file, original, parsed };
  });

  const hasChanges = updatedFiles.some(
    ({ original, parsed }) =>
      JSON.stringify(original) !== JSON.stringify(parsed),
  );

  if (!hasChanges) {
    return { result: 'skip', reason: skipReason };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    updatedFiles.map(async ({ file, original, parsed }) => {
      if (JSON.stringify(original) === JSON.stringify(parsed)) {
        return;
      }

      await fs.promises.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
    }),
  );

  return { result: 'apply' };
};

export const tryUpdatePackageJsonImports: PatchFunction = async ({ mode }) =>
  tryApplyPackageJsonImportPatch(
    mode,
    updateSrcSubpathImportsMapping,
    'no package.json import changes required',
  );

export const tryAddPackageJsonJsonImports: PatchFunction = async ({ mode }) =>
  tryApplyPackageJsonImportPatch(
    mode,
    addSrcJsonSubpathImportsMapping,
    'no package.json json import changes required',
  );

export const updatePackageJsonImports: PatchFunction = async (config) => {
  try {
    return await tryUpdatePackageJsonImports(config);
  } catch (err) {
    log.warn('Failed to update package.json #src imports');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};

export const addPackageJsonJsonImports: PatchFunction = async (config) => {
  try {
    return await tryAddPackageJsonJsonImports(config);
  } catch (err) {
    log.warn('Failed to add package.json #src/*.json imports');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
