import { inspect } from 'util';

import { glob } from 'node:fs/promises';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const DOCKER_COMPOSE_VERSION_REGEX = /^version: ['"]?\d+(\.\d+)*['"]?\n*/m;

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

const patchDockerComposeFiles: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const maybeDockerComposeFiles = await Array.fromAsync(
    glob('docker-compose*.yml'),
  );

  if (!maybeDockerComposeFiles.length) {
    return {
      result: 'skip',
      reason: 'no docker-compose files found',
    };
  }

  const dockerComposeFiles = await fetchFiles(maybeDockerComposeFiles);

  const dockerComposeFilesToPatch = dockerComposeFiles.filter(({ contents }) =>
    DOCKER_COMPOSE_VERSION_REGEX.exec(contents),
  );

  if (!dockerComposeFilesToPatch.length) {
    return {
      result: 'skip',
      reason: 'no docker-compose files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    dockerComposeFilesToPatch.map(async ({ file, contents }) => {
      const patchedContents = contents.replace(
        DOCKER_COMPOSE_VERSION_REGEX,
        '',
      );
      await fs.writeFile(file, patchedContents);
    }),
  );

  return { result: 'apply' };
};

export const tryPatchDockerComposeFiles: PatchFunction = async (config) => {
  try {
    return await patchDockerComposeFiles(config);
  } catch (err) {
    log.warn('Failed to patch pnpm packageManager CI configuration.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
