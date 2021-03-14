import path from 'path';

import { fdir as FDir } from 'fdir';
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
) =>
  new Map(
    patterns.map((pattern) => {
      const isMatch = picomatch(pattern);

      const filepaths = allFilepaths.filter((filepath) => isMatch(filepath));

      return [pattern, filepaths] as const;
    }),
  );

/**
 * List relative filepaths contained within a directory root.
 *
 * This excludes:
 *
 * - `.gitignore`d paths
 * - `.git` subdirectories
 * - `node_modules` subdirectories
 */
export const crawlDirectory = async (root: string) => {
  const gitIgnoreFilter = await createInclusionFilter([
    path.join(root, '.gitignore'),
  ]);

  const output = await new FDir()
    .crawlWithOptions(root, {
      exclude: (dirname) => ['.git', 'node_modules'].includes(dirname),
      filters: [
        (pathname) => {
          const relativePathname = path.relative(root, pathname);

          return gitIgnoreFilter(relativePathname);
        },
      ],
      includeBasePath: true,
    })
    .withPromise();

  // Patch over non-specific `fdir` typings.
  const absoluteFilenames = output as string[];

  const relativeFilepaths = absoluteFilenames.map((filepath) =>
    path.relative(root, filepath),
  );

  return relativeFilepaths;
};

/**
 * Create a filter function that excludes filepaths based on `.gitignore`s.
 */
export const createInclusionFilter = async (gitIgnorePaths: string[]) => {
  const gitIgnores = await Promise.all(
    gitIgnorePaths.map(async (gitIgnorePath) => {
      try {
        return await fs.readFile(gitIgnorePath, 'utf8');
      } catch (err: unknown) {
        if (isErrorWithCode(err, 'ENOENT')) {
          return;
        }

        throw err;
      }
    }),
  );

  const managers = gitIgnores
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ignore().add(value));

  return ignore().add('.git').add(managers).createFilter();
};
