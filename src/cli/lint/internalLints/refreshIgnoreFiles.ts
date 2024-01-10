import path from 'path';
import { inspect } from 'util';

import { writeFile } from 'fs-extra';
import stripAnsi from 'strip-ansi';

import type { Logger } from '../../../utils/logging';
import { detectPackageManager } from '../../../utils/packageManager';
import { readBaseTemplateFile } from '../../../utils/template';
import { getDestinationManifest } from '../../configure/analysis/package';
import { createDestinationFileReader } from '../../configure/analysis/project';
import { mergeWithIgnoreFile } from '../../configure/processing/ignoreFile';
import type { InternalLintResult } from '../internal';

const REFRESHABLE_IGNORE_FILES = [
  '.eslintignore',
  '.gitignore',
  '.prettierignore',
];

export const refreshIgnoreFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
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
        msg: `Refreshed ${logger.bold(filename)}.`,
        filename,
      };
    }

    if (data !== inputFile) {
      const packageManager = await detectPackageManager();

      return {
        needsChange: true,
        msg: `The ${logger.bold(
          filename,
        )} file is out of date. Run \`${logger.bold(
          packageManager.exec,
          'skuba',
          'format',
        )}\` to update it.`,
        filename,
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
      logger.warn(result.msg, logger.dim('refresh-ignore-files'));
    }
  });

  const anyNeedChanging = results.some(({ needsChange }) => needsChange);

  return {
    ok: !anyNeedChanging,
    fixable: anyNeedChanging,
    annotations: results.flatMap(({ needsChange, filename, msg }) =>
      needsChange && msg
        ? [
            {
              path: filename,
              message: stripAnsi(msg),
            },
          ]
        : [],
    ),
  };
};

export const tryRefreshIgnoreFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  try {
    return await refreshIgnoreFiles(mode, logger);
  } catch (err) {
    logger.warn('Failed to refresh ignore files.');
    logger.subtle(inspect(err));

    return {
      ok: false,
      fixable: false,
      annotations: [],
    };
  }
};
