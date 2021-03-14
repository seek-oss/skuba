import path from 'path';

import fs from 'fs-extra';

import { buildPatternToFilepathMap, crawlDirectory } from '../../../utils/dir';
import { isErrorWithCode } from '../../../utils/error';
import { loadModules } from '../modules';
import { FileDiff, Files, Module, Options } from '../types';

import { determineOperation } from './diff';

export const createDestinationFileReader = (root: string) => async (
  filename: string,
): Promise<string | undefined> => {
  try {
    return await fs.readFile(path.join(root, filename), 'utf8');
  } catch (err: unknown) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return;
    }

    throw err;
  }
};

const loadModuleFiles = async (modules: Module[], destinationRoot: string) => {
  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const filepaths = await crawlDirectory(destinationRoot);

  const fileEntries = await Promise.all(
    filepaths.map(
      async (filepath) =>
        [filepath, await readDestinationFile(filepath)] as const,
    ),
  );

  const patterns = [...new Set(modules.flatMap((m) => Object.keys(m)))];

  return {
    inputFiles: Object.fromEntries(fileEntries),
    patternToFilepaths: buildPatternToFilepathMap(patterns, filepaths),
  };
};

const processTextFiles = (
  modules: Module[],
  inputFiles: Readonly<Files>,
  patternToFilepaths: Map<string, string[]>,
) => {
  const outputFiles = { ...inputFiles };

  const textProcessorEntries = modules.flatMap((module) =>
    Object.entries(module).flatMap(([pattern, processText]) =>
      (patternToFilepaths.get(pattern) ?? []).map(
        (filepath) => [filepath, processText] as const,
      ),
    ),
  );

  for (const [filepath, processText] of textProcessorEntries) {
    outputFiles[filepath] = processText(
      outputFiles[filepath],
      outputFiles,
      inputFiles,
    );
  }

  return outputFiles;
};

export const diffFiles = async (opts: Options): Promise<FileDiff> => {
  const modules = await loadModules(opts);

  const { inputFiles, patternToFilepaths } = Object.freeze(
    await loadModuleFiles(modules, opts.destinationRoot),
  );

  const outputFiles = processTextFiles(modules, inputFiles, patternToFilepaths);

  const diffEntries = Object.entries(outputFiles)
    .filter(([filepath, data]) => inputFiles[filepath] !== data)
    .map(([filepath, data]) => {
      const operation = determineOperation(inputFiles[filepath], data);

      return [filepath, { data, operation }] as const;
    });

  return Object.fromEntries(diffEntries);
};
