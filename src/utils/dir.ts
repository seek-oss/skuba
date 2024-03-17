import path from 'path';

import fs from 'fs-extra';
import ignore from 'ignore';
import picomatch from 'picomatch';

import { isErrorWithCode } from './error';

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
