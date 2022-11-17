import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import { log } from '../../utils/logging';

import { getDestinationManifest } from './analysis/package';
import { createDestinationFileReader } from './analysis/project';
import { formatPrettier } from './processing/prettier';

const addEmptyExports = async () => {
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
      return;
    }

    const data = formatPrettier([inputFile, 'export {}'].join('\n\n'), {
      parser: 'typescript',
    });

    const filepath = path.join(destinationRoot, filename);

    await fs.promises.writeFile(filepath, data);
  };

  // TODO: glob `**/jest.*setup*.ts`?
  const jestSetupFiles = ['jest.setup.ts', 'jest.setup.int.ts'];

  await Promise.all(jestSetupFiles.map(addEmptyExport));
};

/**
 * Tries to add an empty `export {}` statement to the bottom of Jest setup files
 * for compliance with TypeScript isolated modules.
 */
export const tryAddEmptyExports = async () => {
  try {
    await addEmptyExports();
  } catch (err) {
    log.warn('Failed to convert Jest setup files to isolated modules.');
    log.subtle(inspect(err));
  }
};
