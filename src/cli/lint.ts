import path from 'path';

import chalk from 'chalk';
import { pathExists } from 'fs-extra';

import { hasDebugFlag, hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';
import { getConsumerManifest } from '../utils/manifest';

import { Input } from './lint/types';

const externalLint = ({ debug, serial }: Input) =>
  execConcurrently(
    [
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
    ],
    {
      // `--debug` implies `--serial`.
      maxProcesses: debug || serial ? 1 : undefined,
    },
  );

const noSkubaTemplateJs = async () => {
  const manifest = await getConsumerManifest();

  if (!manifest) {
    return;
  }

  const templateConfigPath = path.join(
    path.dirname(manifest.path),
    'skuba.template.js',
  );

  if (await pathExists(templateConfigPath)) {
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

export const lint = async (args = process.argv) => {
  const input: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
  };

  await externalLint(input);

  await internalLint();
};
