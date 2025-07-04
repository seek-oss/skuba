import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { getDestinationManifest } from '../../../../../configure/analysis/package.js';
import { createDestinationFileReader } from '../../../../../configure/analysis/project.js';
import { formatPrettier } from '../../../../../configure/processing/prettier.js';
import type { PatchFunction } from '../../index.js';

const JEST_SETUP_FILES = ['jest.setup.ts', 'jest.setup.int.ts'];

const addEmptyExports = async (mode: 'format' | 'lint') => {
  const manifest = await getDestinationManifest();

  const destinationRoot = path.dirname(manifest.path);

  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const addEmptyExport = async (filename: string) => {
    const inputFile = await readDestinationFile(filename);

    if (
      !inputFile ||
      // The file appears to have an import or export so it should be compatible
      // with isolated modules. This is a very naive check that we don't want to
      // overcomplicate because it is invoked before many skuba commands.
      inputFile.includes('import ') ||
      inputFile.includes('export ')
    ) {
      return 'skip';
    }

    if (mode === 'lint') {
      return 'apply';
    }

    const data = await formatPrettier([inputFile, 'export {}'].join('\n\n'), {
      parser: 'typescript',
    });

    const filepath = path.join(destinationRoot, filename);

    await fs.promises.writeFile(filepath, data);

    return 'apply';
  };

  const results = await Promise.all(JEST_SETUP_FILES.map(addEmptyExport));
  return results.every((result) => result === 'skip') ? 'skip' : 'apply';
};

/**
 * Tries to add an empty `export {}` statement to the bottom of Jest setup files
 * for compliance with TypeScript isolated modules.
 */
export const tryAddEmptyExports: PatchFunction = async ({ mode }) => {
  try {
    return { result: await addEmptyExports(mode) };
  } catch (err) {
    log.warn('Failed to convert Jest setup files to isolated modules.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
