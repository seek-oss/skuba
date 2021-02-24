import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';

import { hasDebugFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';
import { getConsumerManifest } from '../utils/manifest';

interface Options {
  debug: boolean;
}

const externalLint = ({ debug }: Options) =>
  execConcurrently([
    {
      command: `eslint${
        debug ? ' --debug' : ''
      } --ext=js,ts,tsx --report-unused-disable-directives .`,
      name: 'ESLint',
      prefixColor: 'magenta',
    },
    {
      command: `tsc${debug ? ' --extendedDiagnostics' : ''} --noEmit`,
      name: 'tsc',
      prefixColor: 'blue',
    },
    {
      command: `prettier --check${debug ? ' --loglevel debug' : ''} .`,
      name: 'Prettier',
      prefixColor: 'cyan',
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
  const opts: Options = {
    debug: hasDebugFlag(),
  };

  await externalLint(opts);

  await internalLint();
};
