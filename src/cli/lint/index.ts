import path from 'path';

import chalk from 'chalk';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';
import { pathExists } from '../../utils/dir';
import { execConcurrently } from '../../utils/exec';
import { log } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';

import { runESLintInMainThread, runESLintInWorkerThread } from './eslint';
import { runPrettierInMainThread, runPrettierInWorkerThread } from './prettier';
import type { Input } from './types';

const execTsc = async ({ debug, tscOutputStream }: Input): Promise<boolean> => {
  const command = [
    'tsc',
    ...(debug ? ['--extendedDiagnostics'] : []),
    '--noEmit',
  ].join(' ');

  try {
    // Misappropriate `concurrently` as a stdio prefixer.
    // We can use our regular console logger once we decide on an approach for
    // compiling in-process, whether by interacting with the TypeScript Compiler
    // API directly or using a higher-level tool like esbuild.
    await execConcurrently(
      [
        {
          command,
          name: 'tsc',
          prefixColor: 'blue',
        },
      ],
      {
        maxProcesses: 1,
        nameLength: 'Prettier'.length,
        outputStream: tscOutputStream,
      },
    );

    return true;
  } catch {
    return false;
  }
};

const externalLintConcurrently = async (input: Input) => {
  const [eslintOk, prettierOk, tscOk] = await Promise.all([
    runESLintInWorkerThread(input),
    runPrettierInWorkerThread(input),
    execTsc(input),
  ]);

  return { eslintOk, prettierOk, tscOk };
};

const externalLintSerially = async (input: Input) => {
  const eslintOk = await runESLintInMainThread(input);
  const prettierOk = await runPrettierInMainThread(input);
  const tscOk = await execTsc(input);

  return { eslintOk, prettierOk, tscOk };
};

const externalLint = async (input: Input) => {
  log.newline();

  const lint =
    // `--debug` implies `--serial`.
    input.debug || input.serial
      ? externalLintSerially
      : externalLintConcurrently;

  const { eslintOk, prettierOk, tscOk } = await lint(input);

  log.newline();

  if (eslintOk && prettierOk && tscOk) {
    return;
  }

  // Some stdio doesn't resolve synchronously, so wait for a bit.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const tools = [
    ...(eslintOk ? [] : ['ESLint']),
    ...(prettierOk ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

  log.err(tools.join(', '), 'found issues that require triage.');
  log.newline();

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

export const lint = async (
  args = process.argv,
  tscOutputStream: NodeJS.WritableStream | undefined = undefined,
) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
  };

  await externalLint(opts);

  await internalLint();
};
