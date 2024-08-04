import { inspect } from 'util';

import { readFile, rm, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { createExec } from '../../../../../../utils/exec';
import { log } from '../../../../../../utils/logging';
import { mergeWithConfigFile } from '../../../../../configure/processing/configFile';

const upgradeESLint: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  if (mode === 'lint') {
    return { result: 'apply' };
  }

  // Remove managed section of .eslintignore
  await writeFile(
    '.eslintignore',
    mergeWithConfigFile('', 'ignore')(await readFile('.eslintignore', 'utf8')),
  );

  const exec = createExec({
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  await exec('eslint-migrate-config', '.eslintrc.js', '--commonjs');

  const output = await readFile('eslint.config.cjs', 'utf8');
  await writeFile('eslint.config.js', output);

  await Promise.all([
    rm('.eslintignore'),
    rm('eslint.config.cjs'),
    rm('.eslintrc.js'),
  ]);

  return { result: 'apply' };
};

export const tryUpgradeESLint: PatchFunction = async (config) => {
  try {
    return await upgradeESLint(config);
  } catch (err) {
    log.warn('Failed to upgrade ESLint to flag config.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};

// TODO: write some tests and handle skip cases
