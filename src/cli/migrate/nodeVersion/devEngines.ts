import { join } from 'path';

import fs from 'fs-extra';

import { globFiles } from '../../../utils/glob.js';
import { isObject } from '../../../utils/validation.js';
import {
  formatPackage,
  parsePackage,
} from '../../configure/processing/package.js';

const PACKAGE_MANAGER_REGEX = /^(?<name>[^@\s]+)@(?<version>\S+)$/;

const BUILDKITE_CACHE_KEY_REGEX = /\bpackage\.json#\.packageManager\b/g;

export const patchPackageJsonDevEngines = async (contents: string) => {
  const packageJson = parsePackage(contents);

  if (typeof packageJson?.packageManager !== 'string') {
    return contents;
  }

  const devEngines = packageJson.devEngines ?? {};

  if (!isObject(devEngines) || devEngines.packageManager !== undefined) {
    return contents;
  }

  const { name, version } =
    PACKAGE_MANAGER_REGEX.exec(packageJson.packageManager)?.groups ?? {};

  if (!name || !version) {
    return contents;
  }

  delete packageJson.packageManager;
  packageJson.devEngines = {
    ...devEngines,
    packageManager: { name, version, onFail: 'error' },
  };

  return formatPackage(packageJson);
};

export const patchBuildkiteDevEngines = (contents: string) =>
  contents.replace(
    BUILDKITE_CACHE_KEY_REGEX,
    'package.json#.devEngines.packageManager',
  );

const patchFiles = async (
  dir: string,
  pattern: string,
  patch: (contents: string) => string | Promise<string>,
) => {
  const paths = await globFiles(pattern, {
    cwd: dir,
    exclude: ['**/node_modules/**'],
  });

  await Promise.all(
    paths.map(async (filePath) => {
      const fullPath = join(dir, filePath);
      const contents = await fs.promises.readFile(fullPath, 'utf8');

      const patched = await patch(contents);

      if (patched !== contents) {
        await fs.promises.writeFile(fullPath, patched);
      }
    }),
  );
};

export const migratePackageManagerToDevEngines = async (dir: string) => {
  await patchFiles(dir, '**/package.json', patchPackageJsonDevEngines);
  await patchFiles(dir, '**/.buildkite/*', patchBuildkiteDevEngines);
};
