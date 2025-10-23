import picomatch from 'picomatch';
import { expect } from 'vitest';

import {
  DEFAULT_PACKAGE_MANAGER,
  configForPackageManager,
} from '../../../utils/packageManager.js';
import type { Files, Module, Options } from '../types.js';

export function assertDefined<T>(value?: T): asserts value is T {
  expect(value).toBeDefined();
}

export const defaultOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/app.ts',
  firstRun: true,
  packageManager: configForPackageManager(DEFAULT_PACKAGE_MANAGER),
  type: 'application',
};

export const defaultPackageOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/index.ts',
  firstRun: true,
  packageManager: configForPackageManager(DEFAULT_PACKAGE_MANAGER),
  type: 'package',
};

export const executeModule = async (
  createModule: (opts: Options) => Module | Promise<Module>,
  inputFiles: Readonly<Files>,
  opts: Options,
): Promise<Files> => {
  const mod = await createModule(opts);

  const outputFiles = { ...inputFiles };

  const allFilepaths = Object.keys(outputFiles);

  for (const [pattern, processText] of Object.entries(mod)) {
    const isMatch = picomatch(pattern);

    // Include the raw pattern along with any matched filepaths.
    // Some modules create a new file at the specified pattern.
    const filepaths = [pattern, ...allFilepaths.filter((p) => isMatch(p))];

    for (const filepath of [...new Set(filepaths)]) {
      outputFiles[filepath] = await processText(
        outputFiles[filepath],
        outputFiles,
        inputFiles,
      );
    }
  }

  return outputFiles;
};
