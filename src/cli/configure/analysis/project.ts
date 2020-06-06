import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';

import { isErrorWithCode } from '../../../utils/error';
import { loadModules } from '../modules';
import { FileDiff, Files, Module, Options } from '../types';

export const createDestinationFileReader = (root: string) => async (
  filename: string,
): Promise<string | undefined> => {
  try {
    return await fs.readFile(path.join(root, filename), 'utf8');
  } catch (err) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return;
    }

    throw err;
  }
};

const determineOperation = (oldFile?: string, newFile?: string): string => {
  if (typeof oldFile === 'undefined') {
    return chalk.green('A');
  }

  return typeof newFile === 'undefined' ? chalk.red('D') : chalk.yellow('M');
};

const loadModuleFiles = async (modules: Module[], destinationRoot: string) => {
  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const allFilenames = modules.flatMap((module) => Object.keys(module));

  const uniqueFilenames = [...new Set(allFilenames)];

  const fileEntries = await Promise.all(
    uniqueFilenames.map(
      async (filename) =>
        [filename, await readDestinationFile(filename)] as const,
    ),
  );

  return Object.fromEntries(fileEntries);
};

const processTextFiles = (modules: Module[], inputFiles: Readonly<Files>) => {
  const outputFiles = { ...inputFiles };

  const textProcessorEntries = modules.flatMap((module) =>
    Object.entries(module),
  );

  for (const [filename, processText] of textProcessorEntries) {
    outputFiles[filename] = processText(
      outputFiles[filename],
      outputFiles,
      inputFiles,
    );
  }

  return outputFiles;
};

export const diffFiles = async (opts: Options): Promise<FileDiff> => {
  const modules = await loadModules(opts);

  const inputFiles = Object.freeze(
    await loadModuleFiles(modules, opts.destinationRoot),
  );

  const outputFiles = processTextFiles(modules, inputFiles);

  const diffEntries = Object.entries(outputFiles)
    .filter(([filename, data]) => inputFiles[filename] !== data)
    .map(([filename, data]) => {
      const operation = determineOperation(inputFiles[filename], data);

      return [filename, { data, operation }] as const;
    });

  return Object.fromEntries(diffEntries);
};
