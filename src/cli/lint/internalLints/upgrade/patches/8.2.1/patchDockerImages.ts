import { inspect } from 'util';

import { glob as fg } from 'node:fs/promises';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const DOCKER_IMAGE_REGEX = /^(FROM\s?.*)(\s)(node|python)(:.*)/gm;
const DOCKER_IMAGE_PLATFORM_REGEX = /^(FROM\s?.*)(--platform=[^\s]+) /gm;
const DOCKER_COMPOSE_IMAGE_REGEX = /^(\s+image:\s)(node|python)(:.*)/gm;
const PUBLIC_ECR = 'public.ecr.aws/docker/library/';

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

const isInvalidPlatformFlagUsage = (contents: string) => {
  const matches = [...contents.matchAll(DOCKER_IMAGE_PLATFORM_REGEX)];

  if (!matches.length) {
    return false;
  }

  const uniquePlatforms = [
    ...new Set(matches.map(([, , platform]) => platform as string)),
  ];

  // Multiple --platform flags are used which may indicate a multi arch build
  if (uniquePlatforms.length > 1) {
    return false;
  }

  // Avoid patching as they may be using args to set the platform
  if (uniquePlatforms[0]?.startsWith('--platform=$')) {
    return false;
  }

  return true;
};

const patchDockerImages: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const [maybeDockerFilesPaths, maybeDockerComposePaths] = await Promise.all([
    Array.fromAsync(fg('Dockerfile*')),
    Array.fromAsync(fg('docker-compose*.y*ml')),
  ]);

  if (!maybeDockerFilesPaths.length && !maybeDockerComposePaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfile or docker-compose files found',
    };
  }

  const [dockerFiles, dockerComposeFiles] = await Promise.all([
    fetchFiles(maybeDockerFilesPaths),
    fetchFiles(maybeDockerComposePaths),
  ]);

  const dockerFilesToPatch = dockerFiles.filter(
    ({ contents }) =>
      DOCKER_IMAGE_REGEX.exec(contents) ?? isInvalidPlatformFlagUsage(contents),
  );

  const dockerComposeFilesToPatch = dockerComposeFiles.filter(({ contents }) =>
    DOCKER_COMPOSE_IMAGE_REGEX.exec(contents),
  );

  if (!dockerFilesToPatch.length && !dockerComposeFilesToPatch.length) {
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
      let patchedContents = contents.replace(
        DOCKER_IMAGE_REGEX,
        `$1$2${PUBLIC_ECR}$3$4`,
      );

      if (isInvalidPlatformFlagUsage(contents)) {
        patchedContents = patchedContents.replace(
          DOCKER_IMAGE_PLATFORM_REGEX,
          '$1',
        );
      }

      await fs.writeFile(file, patchedContents);
    },
  );

  const dockerComposeFilePatches = dockerComposeFilesToPatch.map(
    async ({ file, contents }) => {
      const patchedContents = contents.replace(
        DOCKER_COMPOSE_IMAGE_REGEX,
        `$1${PUBLIC_ECR}$2$3`,
      );
      await fs.writeFile(file, patchedContents);
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
