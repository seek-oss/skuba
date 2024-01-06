import path from 'path';
import { inspect } from 'util';

import { writeFile } from 'fs-extra';

import type { Logger } from '../../../utils/logging';
import { detectPackageManager } from '../../../utils/packageManager';
import { readBaseTemplateFile } from '../../../utils/template';
import { getDestinationManifest } from '../../configure/analysis/package';
import { createDestinationFileReader } from '../../configure/analysis/project';
import { mergeWithIgnoreFile } from '../../configure/processing/ignoreFile';

const REFRESHABLE_IGNORE_FILES = [
  '.eslintignore',
  '.gitignore',
  '.prettierignore',
];

export const refreshIgnoreFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
) => {
  // TODO: check current state of .gitignore
  // If it contains !.npmrc, break
  // If it contains .npmrc, we can either
  // 1. Move the entry below the skuba-managed section for manual triage
  // 2. Delete any local .npmrc state before un-ignoring the .npmrc

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

    if (mode === 'format') {
      if (data === inputFile) {
        return { needsChange: false };
      }

      await writeFile(filepath, data);
      return {
        needsChange: false,
        msg: `Refreshed ${logger.bold(filename)}. ${logger.dim(
          'refresh-ignore-files',
        )}`,
      };
    }

    if (data !== inputFile) {
      const packageManager = await detectPackageManager();

      return {
        needsChange: true,
        msg: `The ${logger.bold(
          filename,
        )} file is out of date. Run ${logger.bold(
          packageManager.exec,
          'skuba',
          'format',
        )} to update it. ${logger.dim('refresh-ignore-files')}`,
      };
    }

    return { needsChange: false };
  };

  const results = await Promise.all(
    REFRESHABLE_IGNORE_FILES.map(refreshIgnoreFile),
  );

  // Log after for reproducible test output ordering
  results.forEach((result) => {
    if (result.msg) {
      logger.warn(result.msg);
    }
  });

  const anyNeedChanging = results.some(({ needsChange }) => needsChange);

  return {
    ok: !anyNeedChanging,
    fixable: anyNeedChanging,
  };
};

export const tryRefreshIgnoreFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
) => {
  try {
    return await refreshIgnoreFiles(mode, logger);
  } catch (err) {
    logger.warn('Failed to refresh ignore files.');
    logger.subtle(inspect(err));

    return {
      ok: false,
      fixable: false,
    };
  }
};
