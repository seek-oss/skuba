import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';
import ignore from 'ignore';

import { isErrorWithCode } from './error';
import { log } from './logging';

export type TextProcessor = (contents: string) => string;

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
  { overwrite = true, processors }: CopyFilesOptions,
) => {
  const oldContents = await fs.readFile(sourcePath, 'utf8');

  const newContents = processors.reduce(
    (contents, process) => process(contents),
    oldContents,
  );

  if (oldContents === newContents && sourcePath === destinationPath) {
    return;
  }

  try {
    await fs.writeFile(destinationPath, newContents, {
      flag: overwrite ? 'w' : 'wx',
    });
  } catch (err) {
    if (isErrorWithCode(err, 'EEXIST')) {
      return;
    }

    throw err;
  }
};

interface CopyFilesOptions {
  sourceRoot: string;
  destinationRoot: string;

  include: (pathname: string) => boolean;
  overwrite?: boolean;
  processors: Array<TextProcessor>;
}

export const createEjsRenderer = (
  templateData: Record<string, unknown>,
): TextProcessor => (contents) => ejs.render(contents, templateData);

export const createStringReplacer = (
  replacements: Array<{
    input: RegExp;
    output: string;
  }>,
): TextProcessor => (contents) =>
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
    path.join(
      currentDestinationDir,
      filename.replace(/^_\./, '.').replace(/^_package\.json/, 'package.json'),
    );

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
        await copyFile(sourcePath, destinationPath, opts);
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
