import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import { lt } from 'semver';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const DOCKERFILE_COREPACK_COMMAND = 'RUN corepack enable pnpm';
const PACKAGE_JSON_MOUNT = `RUN --mount=type=bind,source=package.json,target=package.json \\
  corepack enable pnpm && corepack install`;
const PACKAGE_JSON_CACHE = '- package.json#.packageManager';

const BEFORE_PIPELINE_REGEX =
  /(\s*cache-on:\s*\n\s*-\s*\.npmrc\s*\n)((\s*)-\s*pnpm-lock\.yaml)/gm;
const ECR_REGEX = /seek-oss\/docker-ecr-cache#v([\d\.]+)/gm;

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

const patchPnpmPackageManager: PatchFunction = async ({
  mode,
  manifest,
  packageManager,
}): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not using pnpm',
    };
  }

  if (
    !(
      manifest.packageJson as { packageManager?: string }
    ).packageManager?.includes('pnpm')
  ) {
    return {
      result: 'skip',
      reason: 'no packageManager declaration in package.json found',
    };
  }

  const [maybeDockerfiles, maybePipelines] = await Promise.all([
    fg(['Dockerfile*']),
    fg(['.buildkite/*.yml']),
  ]);

  if (!maybeDockerfiles.length || !maybePipelines.length) {
    return {
      result: 'skip',
      reason: 'Either dockerfiles or pipelines were not found',
    };
  }

  const [dockerfiles, pipelines] = await Promise.all([
    fetchFiles(maybeDockerfiles),
    fetchFiles(maybePipelines),
  ]);

  const dockerFilesToPatch = dockerfiles.filter(
    ({ contents }) =>
      contents.includes(DOCKERFILE_COREPACK_COMMAND) &&
      !contents.includes('target=package.json'),
  );

  const pipelinesToPatch = pipelines.filter(({ contents }) =>
    Boolean(BEFORE_PIPELINE_REGEX.exec(contents)),
  );

  if (!dockerFilesToPatch.length && !pipelinesToPatch.length) {
    return {
      result: 'skip',
      reason: 'no pipeline or dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  if (dockerFilesToPatch.length) {
    await Promise.all(
      dockerFilesToPatch.map(async ({ file, contents }) => {
        const patchedContent = contents.replace(
          DOCKERFILE_COREPACK_COMMAND,
          PACKAGE_JSON_MOUNT,
        );
        await fs.writeFile(file, patchedContent);
      }),
    );
  }

  if (pipelinesToPatch.length) {
    await Promise.all(
      pipelinesToPatch.map(async ({ file, contents }) => {
        const patchedContent = contents.replace(
          BEFORE_PIPELINE_REGEX,
          `$1$3${PACKAGE_JSON_CACHE}\n$2`,
        );

        const patchedEcrContent = patchedContent.replace(
          ECR_REGEX,
          (match, version) => {
            if (typeof version === 'string' && lt(version, '2.2.0')) {
              return 'seek-oss/docker-ecr-cache#v2.2.0';
            }
            return match;
          },
        );

        await fs.writeFile(file, patchedEcrContent);
      }),
    );
  }

  return { result: 'apply' };
};

export const tryPatchPnpmPackageManager: PatchFunction = async (config) => {
  try {
    return await patchPnpmPackageManager(config);
  } catch (err) {
    log.warn('Failed to patch pnpm packageManager CI configuration.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
