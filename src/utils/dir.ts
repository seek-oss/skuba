import path from 'path';

import fs from 'fs-extra';
import ignore from 'ignore';
import picomatch from 'picomatch';

import { isErrorWithCode } from './error.js';

import * as Git from '@skuba-lib/api/git';

/**
 * Build a map that associates each glob pattern with its matching filepaths.
 */
export const buildPatternToFilepathMap = (
  patterns: string[],
  allFilepaths: string[],
  options?: picomatch.PicomatchOptions,
) =>
  Object.fromEntries(
    patterns.map((pattern) => {
      const isMatch = picomatch(pattern, options);

      const filepaths = allFilepaths.filter((filepath) => isMatch(filepath));

      return [pattern, filepaths] as const;
    }),
  );

/**
 * List relative filepaths contained within a directory root.
 *
 * This excludes:
 *
 * - Patterns in the ignore files specified in `ignoreFilenames`
 * - `.git` subdirectories
 * - `node_modules` subdirectories
 */
export const crawlDirectory = async (
  root: string,
  ignoreFilenames = ['.gitignore'],
) => {
  const ignoreFileFilter = await createInclusionFilter(
    ignoreFilenames.map((ignoreFilename) => path.join(root, ignoreFilename)),
  );

  const absoluteFilenames = await crawl(root, {
    includeDirName: (dirname) => !['.git', 'node_modules'].includes(dirname),
    includeFilePath: (pathname) =>
      ignoreFileFilter(path.relative(root, pathname)),
  });

  const relativeFilepaths = absoluteFilenames.map((filepath) =>
    path.relative(root, filepath),
  );

  return relativeFilepaths;
};

/**
 * Create a filter function that excludes filepaths based on ignore files like
 * `.gitignore` and `.prettierignore`.
 */
export const createInclusionFilter = async (ignoreFilepaths: string[]) => {
  const ignoreFiles = await Promise.all(
    ignoreFilepaths.map(async (ignoreFilepath) => {
      try {
        return await fs.promises.readFile(ignoreFilepath, 'utf8');
      } catch (err) {
        if (isErrorWithCode(err, 'ENOENT')) {
          return;
        }

        throw err;
      }
    }),
  );

  const managers = ignoreFiles
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ignore().add(value));

  return ignore().add('.git').add(managers).createFilter();
};

/**
 * Recursively crawl a directory and return all file paths that match the
 * filters. `paths` is mutated and returned.
 */
async function crawl(
  directoryPath: string,
  filters: {
    includeDirName: (dirName: string) => boolean;
    includeFilePath: (path: string) => boolean;
  },
  paths: string[] = [],
) {
  try {
    const entries = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(directoryPath, entry.name);

        if (
          (entry.isFile() || entry.isSymbolicLink()) &&
          filters.includeFilePath(fullPath)
        ) {
          paths.push(fullPath);
        }

        if (entry.isDirectory() && filters.includeDirName(entry.name)) {
          await crawl(fullPath, filters, paths);
        }
      }),
    );
  } catch {
    // Ignore errors, because of e.g. permission issues reading directories
  }

  return paths;
}

export const locateNearestFile = async ({
  cwd,
  filename,
}: {
  cwd: string;
  filename: string;
}) => {
  let currentDir = cwd;
  while (currentDir !== path.dirname(currentDir)) {
    const filePath = path.join(currentDir, filename);
    if (await fs.pathExists(filePath)) {
      return filePath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
};

export const locateFurthestFile = async ({
  cwd,
  filename,
}: {
  cwd: string;
  filename: string;
}) => {
  let currentDir = cwd;
  let furthestFilePath: string | null = null;

  while (currentDir !== path.dirname(currentDir)) {
    const filePath = path.join(currentDir, filename);
    if (await fs.pathExists(filePath)) {
      furthestFilePath = filePath;
    }
    currentDir = path.dirname(currentDir);
  }

  return furthestFilePath;
};

const workspaceRootCache: Record<string, string | null> = {};

export const findWorkspaceRoot = async (
  cwd = process.cwd(),
): Promise<string | null> => {
  const find = async (): Promise<string | null> => {
    const [pnpmLock, yarnLock, packageJson, gitRoot] = await Promise.all([
      locateNearestFile({ cwd, filename: 'pnpm-lock.yaml' }),
      locateNearestFile({ cwd, filename: 'yarn.lock' }),
      locateFurthestFile({ cwd, filename: 'package.json' }),
      Git.findRoot({ dir: cwd }),
    ]);

    const candidates = [
      pnpmLock ? path.dirname(pnpmLock) : null,
      yarnLock ? path.dirname(yarnLock) : null,
      packageJson ? path.dirname(packageJson) : null,
      gitRoot,
    ].filter((dir): dir is string => dir !== null);

    if (candidates[0]) {
      // Pick the longest path. This will be the most specific, which helps guard against someone
      // having an accidental lockfile in a parent directory by mistake.

      return candidates.reduce((longest, current) => {
        if (current.split(path.sep).length > longest.split(path.sep).length) {
          return current;
        }
        return longest;
      }, candidates[0]);
    }

    return null;
  };

  return (workspaceRootCache[cwd] ??= await find());
};

export const findCurrentWorkspaceProjectRoot = async (
  cwd = process.cwd(),
): Promise<string | null> => {
  const packageJson = await locateNearestFile({
    cwd,
    filename: 'package.json',
  });
  return packageJson ? path.dirname(packageJson) : null;
};
