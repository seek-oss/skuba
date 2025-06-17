import { inspect } from 'util';

import { glob } from 'fast-glob';
import { promises as fs } from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

export const hasAppImportRegex =
  /import\s*\{\s*(?:[^}]*,\s*)?App\s*(?:,\s*[^}]*)?\s*\}\s*from\s*['"]aws-cdk-lib['"]/gm;

const addBundlingContext = (contents: string) => {
  if (contents.includes('new App()') && hasAppImportRegex.test(contents)) {
    return contents.replaceAll(
      'new App()',
      "new App({ context: { 'aws:cdk:bundling-stacks': [] } })",
    );
  }

  return contents;
};

const stopBundlingInCDKTests: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const infraTestFileNames = await glob(['**/infra/**/*.test.ts']);

  if (!infraTestFileNames.length) {
    return {
      result: 'skip',
      reason: 'no CDK test files found',
    };
  }

  const infraTestFiles = await fetchFiles(infraTestFileNames);

  const mapped = infraTestFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    after: addBundlingContext(contents),
  }));

  if (!mapped.some(({ before, after }) => before !== after)) {
    return {
      result: 'skip',
      reason: 'no CDK test files need patching',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, after }) => {
      await fs.writeFile(file, after);
    }),
  );

  return { result: 'apply' };
};

export const tryStopBundlingInCDKTests: PatchFunction = async (config) => {
  try {
    return await stopBundlingInCDKTests(config);
  } catch (err) {
    log.warn('Failed to remove bundling in CDK tests');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
