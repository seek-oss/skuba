import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';

import { isErrorWithCode } from './error.js';
import { log } from './logging.js';

export type TextProcessor = (sourcePath: string, contents: string) => string;

export const copyFile = async (
  sourcePath: string,
  destinationPath: string,
  {
    overwrite = true,
    processors,
  }: Pick<CopyFilesOptions, 'overwrite' | 'processors'>,
) => {
  const oldContents = await fs.promises.readFile(sourcePath, 'utf8');

  const newContents = processors.reduce(
    (contents, process) => process(sourcePath, contents),
    oldContents,
  );

  if (oldContents === newContents && sourcePath === destinationPath) {
    return;
  }

  try {
    await fs.promises.writeFile(destinationPath, newContents, {
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
  processors: TextProcessor[];
  stripUnderscorePrefix?: boolean;
}

export const createEjsRenderer =
  (templateData: Record<string, unknown>): TextProcessor =>
  (sourcePath: string, contents) => {
    try {
      return ejs.render(contents, templateData, { strict: false });
    } catch (err) {
      log.err('Failed to render', log.bold(sourcePath));
      log.subtle(err);
      return contents;
    }
  };

export const createStringReplacer =
  (
    replacements: Array<{
      input: RegExp;
      output: string;
    }>,
  ): TextProcessor =>
  (_sourcePath: string, contents) =>
    replacements.reduce(
      (newContents, { input, output }) => newContents.replace(input, output),
      contents,
    );

export const copyFiles = async (
  opts: CopyFilesOptions,
  currentSourceDir: string = opts.sourceRoot,
  currentDestinationDir: string = opts.destinationRoot,
) => {
  const filenames = await fs.promises.readdir(currentSourceDir);

  const toDestinationPath = (filename: string) =>
    path.join(
      currentDestinationDir,
      opts.stripUnderscorePrefix
        ? filename
            .replace(/^_\./, '.')
            .replace(/^_package\.json/, 'package.json')
            .replace(/^_eslint\.config\.js/, 'eslint.config.js')
        : filename,
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
          await fs.promises.mkdir(destinationPath, { recursive: true });
          return copyFiles(opts, sourcePath, destinationPath);
        }

        log.err('Failed to render', log.bold(sourcePath));

        throw err;
      }
    }),
  );
};
