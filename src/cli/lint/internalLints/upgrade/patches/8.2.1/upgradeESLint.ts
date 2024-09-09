// eslint-disable-next-line no-restricted-imports -- fs-extra is mocked
import * as fsp from 'fs/promises';
import path from 'path';
import { inspect } from 'util';

import { promises as fsExtra } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { createExec } from '../../../../../../utils/exec';
import { log } from '../../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../../configure/analysis/project';
import { mergeWithConfigFile } from '../../../../../configure/processing/configFile';
import { formatPrettier } from '../../../../../configure/processing/prettier';

const upgradeESLint: PatchFunction = async ({
  mode,
  dir: cwd = process.cwd(),
}): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(cwd);
  const [originalIgnoreContents, eslintConfig] = await Promise.all([
    readFile('.eslintignore'),
    readFile('.eslintrc.js'),
  ]);

  if (eslintConfig === undefined) {
    return {
      result: 'skip',
      reason: 'no .eslintrc.js - have you already migrated?',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  const mergedIgnoreContent = mergeWithConfigFile(
    '',
    'ignore',
  )(originalIgnoreContents);

  const exec = createExec({
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  // eslint-migrate-config require()s the file, so for testability, put it in a temporary location
  const dir = await writeTemporaryFiles({
    '.eslintrc.js': eslintConfig,
    ...(mergedIgnoreContent.trim().length > 0
      ? { '.eslintignore': mergedIgnoreContent }
      : {}),
  });
  try {
    await exec(
      'eslint-migrate-config',
      path.join(dir, '.eslintrc.js'),
      '--commonjs',
    );

    const output = fiddleWithOutput(
      await fsp.readFile(path.join(dir, 'eslint.config.cjs'), 'utf-8'),
    );
    await fsExtra.writeFile(
      'eslint.config.js',
      await formatPrettier(output, { filepath: 'eslint.config.js' }),
    );

    await Promise.all([
      originalIgnoreContents === undefined
        ? Promise.resolve()
        : fsExtra.rm('.eslintignore'),
      fsExtra.rm('.eslintrc.js'),
    ]);

    return { result: 'apply' };
  } finally {
    await fsp.rm(dir, { recursive: true });
  }
};

const writeTemporaryFiles = async (contents: Record<string, string>) => {
  const dir = await fsp.mkdtemp('eslint-migrate-config');

  for (const [file, content] of Object.entries(contents)) {
    await fsp.writeFile(path.join(dir, file), content);
  }

  return dir;
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

  output = output.replace(
    /^const skuba = require\('eslint-config-skuba'\);\s*module.exports = \[...skuba\];$/m,
    "module.exports = require('eslint-config-skuba');",
  );

  return output;
};

export const tryUpgradeESLint: PatchFunction = async (config) => {
  try {
    return await upgradeESLint(config);
  } catch (err) {
    log.warn('Failed to upgrade ESLint to flat config.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};