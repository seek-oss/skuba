import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import { readPackageUp } from 'read-package-up';

import { log } from '../../../../../../utils/logging.js';
import { formatPackage } from '../../../../../configure/processing/package.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const hasDirNameRegex = /__dirname\b/;
export const hasFileNameRegex = /__filename\b/;

export const addTypeModule = async (cwd: string, originalContent: string) => {
  const manifest = await readPackageUp({ cwd, normalize: false });

  if (manifest === undefined) {
    return originalContent;
  }

  if (manifest.packageJson.type !== 'module') {
    manifest.packageJson.type = 'module';
    return await formatPackage(manifest.packageJson);
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
  process.stderr.write('[DEBUG] addTypeModuleToPackageJson start\n');
  const { mode, manifest } = config;
  process.stderr.write(
    `[DEBUG] addTypeModuleToPackageJson manifest: ${manifest.path}\n`,
  );
  const fileNames: string[] = await fg(['**/*package.json'], {
    cwd: path.dirname(manifest.path),
    ignore: ['**/node_modules/**', '**/.git/**'],
  });
  process.stderr.write(
    `[DEBUG] addTypeModuleToPackageJson glob done: ${fileNames.length}\n`,
  );

  if (!fileNames.length) {
    return {
      result: 'skip',
      reason: 'no package.json file found',
    };
  }

  const packageJsonFiles = await fetchFiles(fileNames);

  const filesWithTypeModuleAdded = await Promise.all(
    packageJsonFiles.map(async ({ file, contents }) => ({
      file,
      before: contents,
      after: await addTypeModule(file, contents),
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
