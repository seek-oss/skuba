import path from 'node:path';
import { inspect } from 'node:util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import type { PatchFunction } from '../..';
import { BuildTool, ProjectType } from '../../../../../../config/types';
import { log } from '../../../../../../utils/logging';
import { isObject } from '../../../../../../utils/validation';
import { getSkubaVersion } from '../../../../../../utils/version';
import { formatPackage } from '../../../../../configure/processing/package';
import { writeSkubaConfig } from '../../../../../init/writeSkubaConfig';

const processPackageJson = async (
  packageJsonPath: string,
  mode: 'lint' | 'format',
): Promise<'apply' | 'skip'> => {
  const contents = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(contents) as { skuba?: unknown };
  if (!isObject(packageJson.skuba)) {
    return 'skip';
  }

  if (mode === 'lint') {
    return 'apply';
  }

  await writeSkubaConfig({
    cwd: path.dirname(packageJsonPath),
    version: await getSkubaVersion(),
    config: {
      assets:
        Array.isArray(packageJson.skuba.assets) &&
        packageJson.skuba.assets.length > 0 &&
        packageJson.skuba.assets.every((asset) => typeof asset === 'string')
          ? packageJson.skuba.assets
          : undefined,
      buildTool: BuildTool.safeParse(packageJson.skuba.build).data,
      entryPoint:
        typeof packageJson.skuba.entryPoint === 'string'
          ? packageJson.skuba.entryPoint
          : undefined,
      projectType: ProjectType.safeParse(packageJson.skuba.type).data,
      template:
        typeof packageJson.skuba.template === 'string'
          ? packageJson.skuba.template
          : undefined,
    },
  });

  delete packageJson.skuba;
  const formatted = await formatPackage(packageJson);
  await fs.writeFile(packageJsonPath, formatted);

  return 'apply';
};

export const tryMoveConfigToSkubaConfigTs: PatchFunction = async ({ mode }) => {
  try {
    const packageJsonFiles = await glob(['**/package.json'], {
      ignore: ['**/node_modules/**'],
    });

    if (!packageJsonFiles.length) {
      return { result: 'skip', reason: 'no package.json files found' };
    }

    const results = await Promise.all(
      packageJsonFiles.map((file) => processPackageJson(file, mode)),
    );

    if (results.every((result) => result === 'skip')) {
      return { result: 'skip', reason: 'no skuba config found' };
    }

    return { result: 'apply' };
  } catch (err) {
    log.warn('Failed to move config from package.json to skuba.config.ts');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
