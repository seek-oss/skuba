import path from 'path';
import { inspect } from 'util';

import { pathExists, rm } from 'fs-extra';

import type { Logger } from '../../../utils/logging';
import { detectPackageManager } from '../../../utils/packageManager';
import type { InternalLintResult } from '../internal';

const AUTOFIX_DELETE_FILES = [
  // Try to delete this SEEK-Jobs/gutenberg automation file that may have been
  // accidentally committed in old versions of skuba.
  'Dockerfile-incunabulum',
];

export const deleteFilesLint = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  const dir = process.cwd();

  const toDelete = (
    await Promise.all(
      AUTOFIX_DELETE_FILES.map(
        async (filename) =>
          [filename, await pathExists(path.join(dir, filename))] as const,
      ),
    )
  )
    .filter(([, exists]) => exists)
    .map(([filename]) => filename);

  if (mode === 'format') {
    if (toDelete.length === 0) {
      return { ok: true, fixable: false };
    }

    try {
      await Promise.all(
        toDelete.map((filename) => {
          logger.warn(`Deleting ${logger.bold(filename)}.`);
          return rm(path.join(dir, filename), { force: true });
        }),
      );

      return {
        ok: true,
        fixable: false,
      };
    } catch (err) {
      logger.warn(logger.bold('Failed to delete files.'));
      logger.subtle(inspect(err));

      return {
        ok: true, // It's not really a huge deal if we can't delete these files
        fixable: false,
      };
    }
  }

  if (toDelete.length) {
    const packageManager = await detectPackageManager();

    logger.warn(
      `Some files should be deleted. Run ${logger.bold(
        packageManager.exec,
        'skuba',
        'format',
      )} to delete them. ${logger.dim('delete-files')}`,
    );

    return {
      ok: false,
      fixable: true,
      annotations: toDelete.map((filename) => ({
        path: filename,
        message: 'This file should be deleted.',
      })),
    };
  }

  return {
    ok: true,
    fixable: false,
  };
};
