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

  const output = await new FDir()
    .crawlWithOptions(root, {
      exclude: (dirname) => ['.git', 'node_modules'].includes(dirname),
      filters: [
        (pathname) => {
          const relativePathname = path.relative(root, pathname);

          return ignoreFileFilter(relativePathname);
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
