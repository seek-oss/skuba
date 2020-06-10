import { Files, Module, Options } from '../types';

export const defaultOpts: Options = {
  destinationRoot: '/tmp',
  entryPoint: 'src/app.ts',
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
