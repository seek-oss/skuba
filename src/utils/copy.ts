import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';
import ignore from 'ignore';

import { isErrorWithCode } from './error';

export const createInclusionFilter = async (gitIgnorePaths: string[]) => {
  const gitIgnores = await Promise.all(
    gitIgnorePaths.map(async (gitIgnorePath) => {
      try {
        return await fs.readFile(gitIgnorePath, 'utf8');
      } catch (err) {
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

export const copyFile = async (
  opts: CopyFilesOptions,
  sourcePath: string,
  destinationPath: string,
) => {
  const replacedData = await ejs.renderFile(sourcePath, opts.templateData);

  await fs.writeFile(destinationPath, replacedData);
};

interface CopyFilesOptions {
  sourceRoot: string;
  destinationRoot: string;

  include: (pathname: string) => boolean;
  templateData: Record<string, unknown>;
}

export const copyFiles = async (
  opts: CopyFilesOptions,
  currentSourceDir: string = opts.sourceRoot,
  currentDestinationDir: string = opts.destinationRoot,
) => {
  const filenames = await fs.readdir(currentSourceDir);

  const toDestinationPath = (filename: string) =>
    path.join(currentDestinationDir, filename.replace(/^_/, ''));

  const filteredFilenames = filenames.filter((filename) =>
    opts.include(
      path.relative(opts.destinationRoot, toDestinationPath(filename)),
    ),
  );

  await Promise.all(
    filteredFilenames.map(async (filename) => {
      const sourcePath = path.join(currentSourceDir, filename);
      const destinationPath = toDestinationPath(filename);

      try {
        await copyFile(opts, sourcePath, destinationPath);
      } catch (err) {
        if (isErrorWithCode(err, 'EISDIR')) {
          await fs.ensureDir(destinationPath);
          return copyFiles(opts, sourcePath, destinationPath);
        }

        console.error(
          `Failed to render '${sourcePath}' with:`,
          opts.templateData,
        );

        throw err;
      }
    }),
  );
};
