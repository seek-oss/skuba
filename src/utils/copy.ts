import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';
import ignore from 'ignore';

import { isErrorWithCode } from './error';
import { log } from './logging';

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

const copyFile = async (
  sourcePath: string,
  destinationPath: string,
  processors: Array<(contents: string) => string>,
) => {
  const contents = processors.reduce(
    (newContents, process) => process(newContents),
    await fs.readFile(sourcePath, 'utf8'),
  );

  await fs.writeFile(destinationPath, contents);
};

interface CopyFilesOptions {
  sourceRoot: string;
  destinationRoot: string;

  include: (pathname: string) => boolean;
  processors: Array<(contents: string) => string>;
}

export const createEjsRenderer = (templateData: Record<string, unknown>) => (
  contents: string,
) => ejs.render(contents, templateData);

export const createStringReplacer = (
  replacements: Array<{
    input: RegExp;
    output: string;
  }>,
) => (contents: string) =>
  replacements.reduce(
    (newContents, { input, output }) => newContents.replace(input, output),
    contents,
  );

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
        await copyFile(sourcePath, destinationPath, opts.processors);
      } catch (err) {
        if (isErrorWithCode(err, 'EISDIR')) {
          await fs.ensureDir(destinationPath);
          return copyFiles(opts, sourcePath, destinationPath);
        }

        log.err('Failed to render', log.bold(sourcePath));

        throw err;
      }
    }),
  );
};
