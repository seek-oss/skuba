import path from 'path';

import chalk from 'chalk';

import { hasDebugFlag } from '../../utils/args';
import { pathExists } from '../../utils/dir';
import { execConcurrently } from '../../utils/exec';
import { log } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';
import { execWorkerThread } from '../../utils/worker';

import type { Input } from './types';

const execTsc = async ({ debug }: Input): Promise<boolean> => {
  try {
    // Misappropriate `concurrently` as a stdio prefixer.
    // We can use our regular console logger once we decide on an approach for
    // compiling in-process, whether by interacting with the TypeScript Compiler
    // API directly or using a higher-level tool like esbuild.
    await execConcurrently(
      [
        {
          command: `tsc${debug ? ' --extendedDiagnostics' : ''} --noEmit`,
          name: 'tsc',
          prefixColor: 'blue',
        },
      ],
      'Prettier'.length,
    );

    return true;
  } catch {
    return false;
  }
};

const externalLint = async (input: Input) => {
  // TODO: run serially based on Buildkite flag or debug flag.
  const [eslintOk, prettierOk, tscOk] = await Promise.all([
    execWorkerThread<Input, boolean>(
      path.posix.join(__dirname, 'eslint.js'),
      input,
    ),
    execWorkerThread<Input, boolean>(
      path.posix.join(__dirname, 'prettier.js'),
      input,
    ),
    execTsc(input),
  ]);

  if (eslintOk && prettierOk && tscOk) {
    return;
  }

  // Some stdio doesn't resolve synchronously.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const tools = [
    ...(eslintOk ? [] : ['ESLint']),
    ...(prettierOk ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

  log.err(tools.join(', '), 'found issues that require triage.');
  log.err(`Did you forget to run ${chalk.bold('yarn skuba format')}?`);
  process.exitCode = 1;
};

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
    log.err(
      `Template is incomplete; run ${chalk.bold(
        'yarn skuba configure',
      )}. ${chalk.dim('no-skuba-template-js')}`,
    );

    process.exitCode = 1;
  }
};

export const internalLint = async () => {
  await noSkubaTemplateJs();
};

export const lint = async () => {
  const opts: Input = {
    debug: hasDebugFlag(),
  };

  await externalLint(opts);

  await internalLint();
};
