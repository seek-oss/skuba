import { findPackageJSON } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import fs from 'fs-extra';
import { parse, stringify } from 'yaml';

import { pathExists } from '../../utils/fs.js';

export const PNPM_LOCK = 'pnpm-lock.yaml';

const PNPM_WORKSPACE_YAML = 'pnpm-workspace.yaml';

const PNPM_PATCHES_DIR = 'patches';

const PNPM_WORKSPACE_FILES = [
  PNPM_WORKSPACE_YAML,
  '.npmrc',
  '.pnpmfile.cjs',
  '.pnpmfile.mjs',
];

/**
 * Files that `pnpm install` leaves behind which record machine-local paths and
 * timestamps, and so would churn the CDK asset hash on every build.
 */
export const PNPM_METADATA_FILES = [
  path.join('node_modules', '.modules.yaml'),
  path.join('node_modules', '.pnpm-workspace-state-v1.json'),
];

export const PNPM_INSTALL_COMMAND: [string, ...string[]] = [
  'pnpm',
  'install',
  '--config.node-linker=hoisted',
  '--config.package-import-method=clone-or-copy',
  '--no-frozen-lockfile',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonFile = async (filePath: string): Promise<unknown> => {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `Failed to parse ${filePath} as JSON: ${(err as Error).message}`,
    );
  }
};

/**
 * Reads the `packageManager` pin from the workspace root manifest.
 *
 * Forwarding it to the output directory keeps the staged install on the same
 * pnpm version as the project.
 */
export const readPackageManagerField = async (
  workspaceRoot: string,
): Promise<string | undefined> => {
  const pkgPath = path.join(workspaceRoot, 'package.json');

  if (!(await pathExists(pkgPath))) {
    return undefined;
  }

  const parsed: unknown = await parseJsonFile(pkgPath);

  return isRecord(parsed) && typeof parsed.packageManager === 'string'
    ? parsed.packageManager
    : undefined;
};

/**
 * The output directory installs a subset of the workspace's dependencies, so
 * most `patchedDependencies` entries have nothing to apply to. pnpm fails the
 * install on an unused patch unless this is set.
 */
const allowUnusedPatches = (content: string): string => {
  let doc: unknown;
  try {
    doc = parse(content);
  } catch (err) {
    throw new Error(
      `Failed to parse ${PNPM_WORKSPACE_YAML}: ${(err as Error).message}`,
    );
  }

  if (!isRecord(doc)) {
    return content;
  }

  doc.allowUnusedPatches = true;

  return stringify(doc);
};

/**
 * Stages the pnpm config that an install in `outputDir` needs.
 *
 * Patch files are staged from `patches`, where `pnpm patch-commit` writes them.
 *
 * Every path written is appended to `stagedFiles` so the caller can strip it
 * back out once the install is done; `.npmrc` in particular may hold registry
 * credentials that must not ship in the asset.
 */
export const stageWorkspaceFiles = async (
  workspaceRoot: string,
  outputDir: string,
  stagedFiles: string[] = [],
): Promise<string[]> => {
  for (const file of PNPM_WORKSPACE_FILES) {
    const src = path.join(workspaceRoot, file);

    if (!(await pathExists(src))) {
      continue;
    }

    const dest = path.join(outputDir, file);

    if (file === PNPM_WORKSPACE_YAML) {
      await fs.promises.writeFile(
        dest,
        allowUnusedPatches(await fs.promises.readFile(src, 'utf8')),
      );
    } else {
      await fs.promises.copyFile(src, dest);
    }

    stagedFiles.push(dest);
  }

  const patchesSrc = path.join(workspaceRoot, PNPM_PATCHES_DIR);

  if (await pathExists(patchesSrc)) {
    const patchesDest = path.join(outputDir, PNPM_PATCHES_DIR);
    await fs.copy(patchesSrc, patchesDest);
    stagedFiles.push(patchesDest);
  }

  return stagedFiles;
};

/**
 * Resolves the installed version of each module, as seen from `resolveFrom`.
 */
export const extractDependencies = async (
  resolveFrom: string,
  modules: string[],
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  const base = pathToFileURL(resolveFrom);

  for (const mod of modules) {
    let modPkgPath: string | undefined;
    try {
      modPkgPath = findPackageJSON(mod, base);
    } catch {
      modPkgPath = undefined;
    }

    const parsed: unknown = modPkgPath
      ? await parseJsonFile(modPkgPath)
      : undefined;
    const version =
      isRecord(parsed) && typeof parsed.version === 'string'
        ? parsed.version.trim()
        : undefined;

    if (!version) {
      throw new Error(
        `Cannot extract version for module '${mod}'. Check that it's referenced in your package.json or installed.`,
      );
    }

    result[mod] = version;
  }

  return result;
};
