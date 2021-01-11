import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';

import { execConcurrently } from '../utils/exec';
import { getConsumerManifest } from '../utils/manifest';

const externalLint = () =>
  execConcurrently([
    {
      command: 'eslint --ext=js,ts,tsx --report-unused-disable-directives .',
      name: 'ESLint',
      prefixColor: 'magenta',
    },
    {
      command: 'prettier --check .',
      name: 'Prettier',
      prefixColor: 'cyan',
    },
    {
      command: 'tsc --noEmit',
      name: 'tsc',
      prefixColor: 'blue',
    },
  ]);

const noSkubaTemplateJs = async () => {
  const manifest = await getConsumerManifest();

  if (!manifest) {
    return;
  }

  const templateConfigPath = path.join(
    path.dirname(manifest.path),
    'skuba.template.js',
  );

  if (await fs.pathExists(templateConfigPath)) {
    throw Error(
      `Template is incomplete; run ${chalk.bold(
        'yarn skuba configure',
      )}. ${chalk.dim('no-skuba-template-js')}`,
    );
  }
};

export const internalLint = async () => {
  await noSkubaTemplateJs();
};

export const lint = async () => {
  await externalLint();

  await internalLint();
};
