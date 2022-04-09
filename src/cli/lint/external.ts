import stream from 'stream';
import { inspect } from 'util';

import { log } from '../../utils/logging';
import { throwOnTimeout } from '../../utils/wait';

import { createAnnotations } from './annotate';
import { autofix } from './autofix';
import { runESLintInCurrentThread, runESLintInWorkerThread } from './eslint';
import {
  runPrettierInCurrentThread,
  runPrettierInWorkerThread,
} from './prettier';
import { runTscInNewProcess } from './tsc';
import type { Input } from './types';

const tscPrefixRegex = /^(.*?tsc\s+│.*?\s)/gm;

export class StreamInterceptor extends stream.Transform {
  private chunks: Uint8Array[] = [];

  public output() {
    return Buffer.concat(this.chunks).toString().replace(tscPrefixRegex, '');
  }

  _transform(
    chunk: Uint8Array,
    _encoding: BufferEncoding,
    callback: stream.TransformCallback,
  ) {
    this.chunks.push(chunk);

    callback(null, chunk);
  }
}

const lintConcurrently = async ({ tscOutputStream, ...input }: Input) => {
  const [eslint, prettier, tscOk] = await Promise.all([
    runESLintInWorkerThread(input),
    runPrettierInWorkerThread(input),
    runTscInNewProcess({ ...input, tscOutputStream }),
  ]);

  return { eslint, prettier, tscOk };
};

/**
 * Run linting tools `--serial`ly for resource-constrained environments.
 *
 * Note that we still run ESLint and Prettier in worker threads as a
 * counterintuitive optimisation. Memory can be more readily freed on worker
 * thread exit, which isn't as easy with a monolithic main thread.
 */
const lintSerially = async ({ tscOutputStream, ...input }: Input) => {
  const eslint = await runESLintInWorkerThread(input);
  const prettier = await runPrettierInWorkerThread(input);
  const tscOk = await runTscInNewProcess({ ...input, tscOutputStream });

  return { eslint, prettier, tscOk };
};

const lintSeriallyWithoutWorkerThreads = async (input: Input) => {
  const eslint = await runESLintInCurrentThread(input);
  const prettier = await runPrettierInCurrentThread(input);
  const tscOk = await runTscInNewProcess(input);

  return { eslint, prettier, tscOk };
};

const selectLintFunction = (input: Input) => {
  if (!input.workerThreads) {
    return lintSeriallyWithoutWorkerThreads;
  }

  // `--debug` implies `--serial`.
  const isSerial = input.debug || input.serial;

  return isSerial ? lintSerially : lintConcurrently;
};

export const externalLint = async (input: Input) => {
  const lint = selectLintFunction(input);

  const tscOutputStream = new StreamInterceptor();
  tscOutputStream.pipe(input.tscOutputStream ?? process.stdout);

  const { eslint, prettier, tscOk } = await lint({ ...input, tscOutputStream });

  try {
    await throwOnTimeout(
      createAnnotations(eslint, prettier, tscOk, tscOutputStream),
      { s: 30 },
    );
  } catch (err) {
    log.warn('Failed to annotate lint results.');
    log.subtle(inspect(err));
  }

  if (eslint.ok && prettier.ok && tscOk) {
    return;
  }

  const tools = [
    ...(eslint.ok ? [] : ['ESLint']),
    ...(prettier.ok ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

  log.newline();
  log.err(`${tools.join(', ')} found issues that require triage.`);

  process.exitCode = 1;

  if (eslint.ok && prettier.ok) {
    // If these are fine then the issue lies with tsc, which we can't autofix.
    return;
  }

  await autofix(input);
};
