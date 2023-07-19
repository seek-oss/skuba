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

export const refreshIgnoreFiles = async () => {
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

    await fs.promises.writeFile(filepath, data);
  };

  await Promise.all(REFRESHABLE_IGNORE_FILES.map(refreshIgnoreFile));
};

export const tryRefreshIgnoreFiles = async () => {
  try {
    await refreshIgnoreFiles();
  } catch (err) {
    log.warn('Failed to refresh ignore files.');
    log.subtle(inspect(err));
  }
};
