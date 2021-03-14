import picomatch from 'picomatch';

import { Files, Module, Options } from '../types';

export function assertDefined<T>(value?: T): asserts value is T {
  expect(value).toBeDefined();
}

export const defaultOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/app.ts',
  firstRun: true,
  type: 'application',
};

export const defaultPackageOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/index.ts',
  firstRun: true,
  type: 'package',
};

export const executeModule = async (
  createModule: (opts: Options) => Module | Promise<Module>,
  inputFiles: Readonly<Files>,
  opts: Options,
): Promise<Files> => {
  const mod = await createModule(opts);

  const outputFiles = { ...inputFiles };

  const filepaths = Object.keys(outputFiles);

  for (const [pattern, processText] of Object.entries(mod)) {
    const isMatch = picomatch(pattern);

    for (const filepath of filepaths.filter((p) => isMatch(p))) {
      outputFiles[filepath] = processText(
        outputFiles[filepath],
        outputFiles,
        inputFiles,
      );
    }
  }

  return outputFiles;
};
