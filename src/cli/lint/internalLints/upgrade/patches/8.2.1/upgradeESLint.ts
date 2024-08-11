import { inspect } from 'util';

import { rm, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { createExec } from '../../../../../../utils/exec';
import { log } from '../../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../../configure/analysis/project';
import { mergeWithConfigFile } from '../../../../../configure/processing/configFile';

const upgradeESLint: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);
  const originalIgnoreContents = await readFile('.eslintignore');

  if (originalIgnoreContents === undefined) {
    return { result: 'skip', reason: 'already migrated' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  // Remove managed section of .eslintignore
  const merged = mergeWithConfigFile('', 'ignore')(originalIgnoreContents);
  let deletedIgnoreFile = false;
  if (merged.trim().length === 0) {
    await rm('.eslintignore');
    deletedIgnoreFile = true;
  } else {
    await writeFile('.eslintignore', merged);
  }

  const exec = createExec({
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  await exec('eslint-migrate-config', '.eslintrc.js', '--commonjs');

  const output = fiddleWithOutput((await readFile('eslint.config.cjs')) ?? '');
  await writeFile('eslint.config.js', output);

  await Promise.all([
    deletedIgnoreFile ? Promise.resolve() : rm('.eslintignore'),
    rm('eslint.config.cjs'),
    rm('.eslintrc.js'),
  ]);

  return { result: 'apply' };
};

const fiddleWithOutput = (input: string) => {
  let output = input.replace(/compat.extends\(["']skuba["']\)/, 'skuba');

  if (!output.includes('eslint-config-skuba')) {
    output = `const skuba = require('eslint-config-skuba');\n\n${output}`;
  }

  if (!output.includes('compat.')) {
    output = output.replace(/const compat = new FlatCompat\(\{[^}]+\}\);/m, '');
    output = output.replace(
      /const \{\s*FlatCompat,?\s*\}\s*=\s*require\(["']@eslint\/eslintrc["']\);/m,
      '',
    );
  }

  if (!output.includes('js.')) {
    output = output.replace(/const js = require\(['"]@eslint\/js['"]\);/, '');
  }

  return output;
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

// TODO: write some tests
