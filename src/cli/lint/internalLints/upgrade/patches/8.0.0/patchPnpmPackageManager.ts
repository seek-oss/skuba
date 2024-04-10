import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchReturnType } from '../..';
import { getConsumerManifest } from '../../../../../../utils/manifest';
import type { PackageManagerConfig } from '../../../../../../utils/packageManager';

const DOCKERFILE_COREPACK_COMMAND = 'corepack enable pnpm';
const PACKAGE_JSON_MOUNT = `RUN --mount=type=bind,source=package.json,target=package.json \\
  corepack enable pnpm && corepack install`;
const PACKAGE_JSON_CACHE = '- package.json#.packageManager';
const BEFORE_PIPELINE_REGEX =
  /(\s*cache-on:\s*\n\s*-\s*\.npmrc\s*\n)((\s*)-\s*pnpm-lock\.yaml)/gm;

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

const patchPnpmPackageManager = async (
  mode: 'format' | 'lint',
  packageManager: PackageManagerConfig,
): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not using pnpm package manager',
    };
  }

  const packageJson = await getConsumerManifest();

  if (
    !(
      packageJson?.packageJson as { packageManager?: string }
    )?.packageManager?.includes('pnpm')
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
    return { result: 'skip', reason: 'no Dockerfiles or pipelines found' };
  }

  const [dockerfiles, pipelines] = await Promise.all([
    fetchFiles(maybeDockerfiles),
    fetchFiles(maybePipelines),
  ]);

  const dockerFilesToPatch = dockerfiles.filter(
    ({ contents }) =>
      contents.includes(DOCKERFILE_COREPACK_COMMAND) &&
      !contents.includes('target=package.json'), // consider this as already patched,
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

  if (pipelinesToPatch.length) {
    await Promise.all(
      pipelinesToPatch.map(async ({ file, contents }) => {
        const patchedContent = contents.replace(
          BEFORE_PIPELINE_REGEX,
          `$1$3${PACKAGE_JSON_CACHE}\n$2`,
        );

        await writeFile(file, patchedContent);
      }),
    );
  }

  if (dockerFilesToPatch.length) {
    await Promise.all(
      dockerFilesToPatch.map(async ({ file, contents }) => {
        const patchedContent = contents.replace(
          DOCKERFILE_COREPACK_COMMAND,
          PACKAGE_JSON_MOUNT,
        );
        await writeFile(file, patchedContent);
      }),
    );
  }

  return { result: 'apply' };
};

// patchPnpmPackageManager('format', {
//   command: 'pnpm',
// } as PackageManagerConfig)
//   .then(console.log)
//   .catch(console.error);
