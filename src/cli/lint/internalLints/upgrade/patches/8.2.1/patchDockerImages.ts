import { inspect } from 'util';

import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const DOCKER_IMAGE_REGEX = /^(FROM\s?.*)(\s)(node|python)(:.*)/gm;
const DOCKER_COMPOSE_IMAGE_REGEX = /^(\s+image:\s+)(node|python)(:.*)/gm;
const PUBLIC_ECR = 'public.ecr.aws/docker/library/';

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

const patchDockerImages: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const [maybeDockerFilesPaths, maybeDockerComposePaths] = await Promise.all([
    fg(['Dockerfile*']),
    fg(['docker-compose*.yml']),
  ]);

  if (!maybeDockerFilesPaths.length || !maybeDockerComposePaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files found',
    };
  }

  const [dockerFiles, dockerComposeFiles] = await Promise.all([
    fetchFiles(maybeDockerFilesPaths),
    fetchFiles(maybeDockerComposePaths),
  ]);

  const dockerFilesToPatch = dockerFiles.filter(({ contents }) =>
    DOCKER_IMAGE_REGEX.exec(contents),
  );

  const dockerComposeFilesToPatch = dockerComposeFiles.filter(({ contents }) =>
    DOCKER_COMPOSE_IMAGE_REGEX.exec(contents),
  );

  if (!dockerFilesToPatch.length || !dockerComposeFilesToPatch.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const dockerFilePatches = dockerFilesToPatch.map(
    async ({ file, contents }) => {
      const patchedContents = contents.replace(
        DOCKER_IMAGE_REGEX,
        `$1$2${PUBLIC_ECR}$3$4`,
      );
      await writeFile(file, patchedContents);
    },
  );

  const dockerComposeFilePatches = dockerComposeFilesToPatch.map(
    async ({ file, contents }) => {
      const patchedContents = contents.replace(
        DOCKER_COMPOSE_IMAGE_REGEX,
        `$1${PUBLIC_ECR}$2$3`,
      );
      await writeFile(file, patchedContents);
    },
  );

  await Promise.all([...dockerFilePatches, ...dockerComposeFilePatches]);

  return { result: 'apply' };
};

export const tryPatchDockerImages: PatchFunction = async (config) => {
  try {
    return await patchDockerImages(config);
  } catch (err) {
    log.warn('Failed to patch Docker images');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
