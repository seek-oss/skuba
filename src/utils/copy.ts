import path from 'path';

import ejs from 'ejs';
import fs from 'fs-extra';

import { buildPatternToFilepathMap, crawlDirectory } from './dir';
import { isErrorWithCode } from './error';
import { type Logger, log } from './logging';
import { getConsumerManifest, getPropFromConsumerManifest } from './manifest';

export type TextProcessor = (contents: string) => string;

const copyFile = async (
  sourcePath: string,
  destinationPath: string,
  {
    overwrite = true,
    processors,
  }: Pick<CopyFilesOptions, 'overwrite' | 'processors'>,
) => {
  const oldContents = await fs.promises.readFile(sourcePath, 'utf8');

  const newContents = processors.reduce(
    (contents, process) => process(contents),
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
  processors: Array<TextProcessor>;
  stripUnderscorePrefix?: boolean;
}

export const createEjsRenderer =
  (templateData: Record<string, unknown>): TextProcessor =>
  (contents) =>
    ejs.render(contents, templateData);

export const createStringReplacer =
  (
    replacements: Array<{
      input: RegExp;
      output: string;
    }>,
  ): TextProcessor =>
  (contents) =>
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

export const copyAssets = async (
  destinationDir: string,
  logger: Logger = log,
) => {
  const manifest = await getConsumerManifest();
  const preserveAssets = await getPropFromConsumerManifest<string[]>(
    'preserveAssets',
  );

  if (!manifest || !preserveAssets) {
    return;
  }

  const resolvedSrcDir = path.join(path.dirname(manifest.path), 'src');
  const resolvedDestinationDir = path.join(
    path.dirname(manifest.path),
    destinationDir,
  );
  const allFiles = await crawlDirectory(resolvedSrcDir);
  const filesByPattern = buildPatternToFilepathMap(preserveAssets, allFiles, {
    cwd: resolvedSrcDir,
    dot: true,
  });

  for (const filenames of Object.values(filesByPattern)) {
    await Promise.all(
      filenames.map(async (filename) => {
        logger?.subtle(`Copying ${filename}`);

        await fs.promises.mkdir(
          path.dirname(path.join(resolvedDestinationDir, filename)),
          { recursive: true },
        );
        await copyFile(
          path.join(resolvedSrcDir, filename),
          path.join(resolvedDestinationDir, filename),
          { processors: [] },
        );
      }),
    );
  }
};
