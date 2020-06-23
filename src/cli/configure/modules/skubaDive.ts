import path from 'path';

import { SKUBA_DIVE_HOOKS } from '../dependencies/skubaDive';
import { prependImport, stripImports } from '../processing/javascript';
import { loadFiles } from '../processing/loadFiles';
import { parsePackage } from '../processing/package';
import { Module, Options } from '../types';

const DEFAULT_FILENAME = 'src/register.ts';

export const skubaDiveModule = ({
  entryPoint,
  type,
}: Options): Promise<Module> => {
  // skuba-dive is a runtime component; it's not appropriate for packages
  if (type === 'package') {
    return Promise.resolve({});
  }

  return Promise.resolve({
    ...loadFiles(DEFAULT_FILENAME, 'package.json'),

    [entryPoint]: (inputFile, files) => {
      const packageJson = parsePackage(files['package.json']);

      const registerFile = files[DEFAULT_FILENAME];

      if (
        !packageJson?.dependencies?.['skuba-dive'] ||
        typeof inputFile === 'undefined' ||
        inputFile.includes('skuba-dive/register') ||
        registerFile?.includes('skuba-dive/register')
      ) {
        return inputFile;
      }

      const outputFile = stripImports(SKUBA_DIVE_HOOKS, inputFile);

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
  });
};
