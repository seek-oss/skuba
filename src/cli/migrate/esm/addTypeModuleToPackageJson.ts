import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import {
  formatPackage,
  parsePackage,
} from '../../configure/processing/package.js';
import type {
  PatchFunction,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

export const hasDirNameRegex = /__dirname\b/;
export const hasFileNameRegex = /__filename\b/;

const PACKAGES_EXCLUDED_FROM_TYPE_MODULE = ['eslint-config-skuba'];

export const addTypeModule = async (originalContent: string) => {
  const packageJson = parsePackage(originalContent);

  if (packageJson === undefined) {
    return originalContent;
  }

  if (
    packageJson.name &&
    PACKAGES_EXCLUDED_FROM_TYPE_MODULE.includes(packageJson.name)
  ) {
    return originalContent;
  }

  if (packageJson.type !== 'module') {
    packageJson.type = 'module';
    return await formatPackage(packageJson);
  }

  return originalContent;
};

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

export const tryAddTypeModuleToPackageJson: PatchFunction = async (
  config,
): Promise<PatchReturnType> => {
  const { mode, manifest } = config;
  const cwd = path.dirname(manifest.path);
  const fileNames: string[] = await fg(['**/*package.json'], {
    cwd,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no package.json file found',
    };
  }

  const packageJsonFiles = await fetchFiles(
    fileNames.map((file) => path.join(cwd, file)),
  );

  const filesWithTypeModuleAdded = await Promise.all(
    packageJsonFiles.map(async ({ file, contents }) => ({
      file,
      before: contents,
      after: await addTypeModule(contents),
    })),
  );

  const hasChanges = filesWithTypeModuleAdded.some(
    ({ before, after }) => before !== after,
  );

  if (!hasChanges) {
    return {
      result: 'skip',
      reason: 'type module already present in package.json',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesWithTypeModuleAdded.map(async ({ file, before, after }) => {
      if (before !== after) {
        await fs.promises.writeFile(file, after);
      }
    }),
  );

  return { result: 'apply' };
};

export const addTypeModuleToPackageJson: PatchFunction = async (config) => {
  try {
    return await tryAddTypeModuleToPackageJson(config);
  } catch (err) {
    log.warn('Failed to add module type to package.json');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
