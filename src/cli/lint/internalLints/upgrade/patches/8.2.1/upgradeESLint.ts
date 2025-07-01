// eslint-disable-next-line no-restricted-imports -- fs-extra is mocked
import * as fsp from 'fs/promises';
import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { createExec } from '../../../../../../utils/exec';
import { log } from '../../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../../configure/analysis/project';
import { mergeWithConfigFile } from '../../../../../configure/processing/configFile';
import { formatPrettier } from '../../../../../configure/processing/prettier';

const IGNORE_FILE = '.eslintignore';
const OLD_CONFIG_FILE = '.eslintrc.js';
const NEW_CONFIG_FILE_JS = 'eslint.config.js';

const upgradeESLint: PatchFunction = async ({
  mode,
  dir: cwd = process.cwd(),
}): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(cwd);
  const [ignoreFileContents, oldConfig] = await Promise.all([
    readFile(IGNORE_FILE),
    readFile(OLD_CONFIG_FILE),
  ]);

  if (oldConfig === undefined) {
    return {
      result: 'skip',
      reason: `no ${OLD_CONFIG_FILE} - have you already migrated?`,
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  const ignoreContentsWithoutSkubaManaged = mergeWithConfigFile(
    '',
    'ignore',
  )(ignoreFileContents);

  const exec = createExec({
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  // eslint-migrate-config require()s the file, so for testability, put it in a temporary location
  const dir = await writeTemporaryFiles({
    [OLD_CONFIG_FILE]: oldConfig,
    ...(ignoreContentsWithoutSkubaManaged.trim().length > 0
      ? { [IGNORE_FILE]: ignoreContentsWithoutSkubaManaged }
      : {}),
  });
  try {
    await exec(
      'eslint-migrate-config',
      path.join(dir, OLD_CONFIG_FILE),
      '--commonjs',
    );

    const output = fiddleWithOutput(
      await fsp.readFile(path.join(dir, NEW_CONFIG_FILE_JS), 'utf-8'),
    );
    await fs.promises.writeFile(
      NEW_CONFIG_FILE_JS,
      await formatPrettier(output, { filepath: NEW_CONFIG_FILE_JS }),
    );

    await Promise.all([
      ignoreFileContents === undefined
        ? Promise.resolve()
        : fs.promises.rm(IGNORE_FILE),
      fs.promises.rm(OLD_CONFIG_FILE),
    ]);

    return { result: 'apply' };
  } finally {
    await fsp.rm(dir, { recursive: true });
  }
};

const writeTemporaryFiles = async (contents: Record<string, string>) => {
  const dir = await fsp.mkdtemp('eslint-migrate-config');

  await Promise.all(
    Object.entries(contents).map(([file, content]) =>
      fsp.writeFile(path.join(dir, file), content),
    ),
  );

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
