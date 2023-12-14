import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import { log } from '../../utils/logging';
import { readBaseTemplateFile } from '../../utils/template';

import { getDestinationManifest } from './analysis/package';
import { createDestinationFileReader } from './analysis/project';
import { mergeWithIgnoreFile } from './processing/ignoreFile';

export const REFRESHABLE_IGNORE_FILES = [
  '.eslintignore',
  '.gitignore',
  '.prettierignore',
];

interface RefreshOptions {
  linting: boolean;
}

export const refreshIgnoreFiles = async ({ linting }: RefreshOptions) => {
  const manifest = await getDestinationManifest();

  const destinationRoot = path.dirname(manifest.path);

  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const refreshIgnoreFile = async (filename: string) => {
    const [inputFile, templateFile] = await Promise.all([
      readDestinationFile(filename),
      readBaseTemplateFile(`_${filename}`),
    ]);

    const data = inputFile
      ? mergeWithIgnoreFile(templateFile)(inputFile)
      : templateFile;

    const filepath = path.join(destinationRoot, filename);

    if (linting) {
      return { ok: data === inputFile, filename };
    }

    await fs.promises.writeFile(filepath, data);
    return { ok: true, filename };
  };

  const results = await Promise.all(
    REFRESHABLE_IGNORE_FILES.map(refreshIgnoreFile),
  );

  if (results.some((result) => !result.ok)) {
    const notOk = results
      .filter((result) => !result.ok)
      .map((r) => r.filename)
      .join(',');

    log.newline();
    log.err(
      `Some ignore files (${notOk}) were not up-to-date. Run \`skuba format\` to refresh them.`,
    );
    process.exitCode = 1;
  }
};

export const tryRefreshIgnoreFiles = async (options: RefreshOptions) => {
  try {
    await refreshIgnoreFiles(options);
  } catch (err) {
    log.warn('Failed to refresh ignore files.');
    log.subtle(inspect(err));
  }
};
