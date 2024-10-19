import { inspect } from 'util';

import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const DOCKER_IMAGE_CONFIG_REGEX =
  /^(RUN --mount=type=bind,source=package.json,target=package.json \\\n(\s+)corepack enable pnpm && corepack install(?:.|\n)+?RUN )(pnpm config set store-dir \/root\/.pnpm-store)/gm;
const DOCKER_IMAGE_FETCH_REGEX =
  /^(RUN --mount=type=bind,source=.npmrc,target=.npmrc \\\n)((?:(?!--mount=type=bind,source=package\.json,target=package\.json)[\s\S])+?\n(\s+)pnpm (fetch|install))/gm;

const PACKAGE_JSON_MOUNT =
  '--mount=type=bind,source=package.json,target=package.json \\\n';

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

const patchPnpmDockerImages: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const maybeDockerFilesPaths = await fg(['Dockerfile*']);

  if (!maybeDockerFilesPaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles found',
    };
  }

  const dockerFiles = await fetchFiles(maybeDockerFilesPaths);

  const dockerFilesToPatch = dockerFiles.filter(
    ({ contents }) =>
      DOCKER_IMAGE_CONFIG_REGEX.exec(contents) ??
      DOCKER_IMAGE_FETCH_REGEX.exec(contents),
  );

  if (!dockerFilesToPatch.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    dockerFilesToPatch.map(async ({ file, contents }) => {
      const patchedContents = contents
        .replace(
          DOCKER_IMAGE_CONFIG_REGEX,
          (_, earlyCommands, whitespace, pnpmSetConfigLine) =>
            `${earlyCommands}${PACKAGE_JSON_MOUNT}${whitespace}${pnpmSetConfigLine}`,
        )
        .replace(
          DOCKER_IMAGE_FETCH_REGEX,
          (_, npmrcLine, rest, whitespace) =>
            `${npmrcLine}${whitespace}${PACKAGE_JSON_MOUNT}${rest}`,
        );

      await writeFile(file, patchedContents);
    }),
  );

  return { result: 'apply' };
};

export const tryPatchPnpmDockerImages: PatchFunction = async (config) => {
  try {
    return await patchPnpmDockerImages(config);
  } catch (err) {
    log.warn('Failed to patch Docker images');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
