import path from 'path';

import fs from 'fs-extra';

import {
  buildPatternToFilepathMap,
  crawlDirectory,
} from '../../../utils/dir.js';
import { isErrorWithCode } from '../../../utils/error.js';
import { loadModules } from '../modules/index.js';
import type { FileDiff, Files, Module, Options } from '../types.js';

import { determineOperation } from './diff.js';

export const createDestinationFileReader =
  (root: string) =>
  async (filename: string): Promise<string | undefined> => {
    try {
      return await fs.promises.readFile(path.join(root, filename), 'utf8');
    } catch (err) {
      if (isErrorWithCode(err, 'ENOENT')) {
        return;
      }

      throw err;
    }
  };

const loadModuleFiles = async (modules: Module[], destinationRoot: string) => {
  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const allFilepaths = await crawlDirectory(destinationRoot);

  const patterns = [...new Set(modules.flatMap((m) => Object.keys(m)))];

  const patternToFilepaths = buildPatternToFilepathMap(patterns, allFilepaths);

  const matchedFilepaths = [
    ...new Set(Object.values(patternToFilepaths).flat()),
  ];

  const fileEntries = await Promise.all(
    matchedFilepaths.map(
      async (filepath) =>
        [filepath, await readDestinationFile(filepath)] as const,
    ),
  );

  return {
    inputFiles: Object.fromEntries(fileEntries),
    patternToFilepaths,
  };
};

const processTextFiles = async (
  modules: Module[],
  inputFiles: Readonly<Files>,
  patternToFilepaths: Record<string, string[]>,
) => {
  const outputFiles = { ...inputFiles };

  const textProcessorEntries = modules.flatMap((module) =>
    Object.entries(module).flatMap(([pattern, processText]) => {
      // Include the raw pattern along with any matched filepaths.
      // Some modules create a new file at the specified pattern.
      const filepaths = [pattern, ...(patternToFilepaths[pattern] ?? [])];

      return [...new Set(filepaths)].map(
        (filepath) => [filepath, processText] as const,
      );
    }),
  );

  for (const [filepath, processText] of textProcessorEntries) {
    outputFiles[filepath] = await processText(
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

  const outputFiles = await processTextFiles(
    modules,
    inputFiles,
    patternToFilepaths,
  );

  const diffEntries = Object.entries(outputFiles)
    .filter(([filepath, data]) => inputFiles[filepath] !== data)
    .map(([filepath, data]) => {
      const operation = determineOperation(inputFiles[filepath], data);

      return [filepath, { data, operation }] as const;
    });

  return Object.fromEntries(diffEntries);
};
