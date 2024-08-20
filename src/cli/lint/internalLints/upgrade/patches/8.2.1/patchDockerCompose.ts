import { inspect } from 'util';

import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

const patchDockerComposeFiles: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const maybeDockerComposeFiles = await Promise.resolve(
    fg(['docker-compose*.yml']),
  );

  if (!maybeDockerComposeFiles.length) {
    return {
      result: 'skip',
      reason: 'no docker-compose files found',
    };
  }

  const dockerComposeFiles = await fetchFiles(maybeDockerComposeFiles);

  const dockerComposeFilesToPatch = dockerComposeFiles.filter(({ contents }) =>
    contents.includes('version:'),
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

  // regex for a docker-compose file with any version
  const DOCKER_COMPOSE_VERSION_REGEX = /version: '.*'\n/;

  await Promise.all(
    dockerComposeFilesToPatch.map(async ({ file, contents }) => {
      const patchedContents = contents.replace(
        DOCKER_COMPOSE_VERSION_REGEX,
        '',
      );
      await writeFile(file, patchedContents);
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
