import { Files, Module, Options } from '../types';

export function assertDefined<T>(value?: T): asserts value is T {
  expect(value).toBeDefined();
}

export const defaultOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/app.ts',
  type: 'application',
};

export const defaultPackageOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/index.ts',
  type: 'package',
};

export const executeModule = async (
  createModule: (opts: Options) => Promise<Module>,
  inputFiles: Readonly<Files>,
  opts: Options,
): Promise<Files> => {
  const mod = await createModule(opts);

  const outputFiles = { ...inputFiles };

  for (const [filename, processText] of Object.entries(mod)) {
    outputFiles[filename] = processText(
      outputFiles[filename],
      outputFiles,
      inputFiles,
    );
  }

  return outputFiles;
};
