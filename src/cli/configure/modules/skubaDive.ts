import path from 'path';

import latestVersion from 'latest-version';

import { prependImport, stripImports } from '../processing/javascript';
import { loadFiles } from '../processing/loadFiles';
import { createDependencyFilter, withPackage } from '../processing/package';
import { merge } from '../processing/record';
import { Module } from '../types';

const BUNDLED_DEPENDENCIES = ['module-alias', 'source-map-support'] as const;

const DEFAULT_FILENAME = 'src/register.ts';

const filterDependencies = createDependencyFilter(
  BUNDLED_DEPENDENCIES,
  'dependencies',
);

export const skubaDiveModule = async ({
  entryPoint,
}: {
  entryPoint: string;
}): Promise<Module> => {
  const skubaDiveVersion = await latestVersion('skuba-dive');

  const skubaDiveData = {
    dependencies: {
      'skuba-dive': skubaDiveVersion,
    },
  };

  return {
    ...loadFiles(DEFAULT_FILENAME),

    [entryPoint]: (inputFile, files) => {
      const registerFile = files[DEFAULT_FILENAME];

      if (
        typeof inputFile === 'undefined' ||
        inputFile.includes('skuba-dive/register') ||
        registerFile?.includes('skuba-dive/register')
      ) {
        return inputFile;
      }

      const outputFile = stripImports(BUNDLED_DEPENDENCIES, inputFile);

      const relativeToSrc = path.posix.relative(
        path.join(entryPoint, '..'),
        'src',
      );

      // import skuba-dive directly from the entry point
      if (relativeToSrc === '') {
        return prependImport('skuba-dive/register', outputFile);
      }

      // import skuba-dive via src/register.ts
      files[DEFAULT_FILENAME] = prependImport(
        'skuba-dive/register',
        registerFile,
      );

      return prependImport(`${relativeToSrc}/register`, outputFile);
    },

    'package.json': withPackage((inputData) => {
      const outputData = merge(inputData, skubaDiveData);

      return filterDependencies(outputData);
    }),
  };
};
