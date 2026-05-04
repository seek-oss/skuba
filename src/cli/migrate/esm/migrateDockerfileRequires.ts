import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';

export const migrateDockerfileRequires: PatchFunction = async ({ mode }) => {
  const dockerfilePaths = await fg(['**/Dockerfile*'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (!dockerfilePaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfile files found',
    };
  }

  const dockerFiles = await Promise.all(
    dockerfilePaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const filesToPatch = dockerFiles
    .map(({ contents, file }) => {
      const newContent = contents.replaceAll('--require', '--import');
      if (newContent !== contents) {
        return {
          file,
          contents: newContent,
        };
      }

      return null;
    })
    .filter((file) => file !== null);

  if (!filesToPatch.length) {
    return {
      result: 'skip',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesToPatch.map(async (filePath) =>
      fs.promises.writeFile(filePath.file, filePath.contents, 'utf8'),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateDockerfileRequires: PatchFunction = async (opts) => {
  try {
    return await migrateDockerfileRequires(opts);
  } catch (err) {
    log.warn('Failed to migrate Dockerfile requires, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
