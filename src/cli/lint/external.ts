import stream from 'stream';

import { createLogger } from '../../utils/logging';

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
  const logger = createLogger(true, 'I am going crazy |');
  logger.debug('ESLint');
  const eslint = await runESLintInWorkerThread(input);
  logger.debug('ESLint done');
  logger.debug('prettier');
  const prettier = await runPrettierInWorkerThread(input);
  logger.debug('prettier done');
  logger.debug('tsc');
  const tscOk = await runTscInNewProcess({ ...input, tscOutputStream });
  logger.debug('tsc done');

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

  return {
    eslint,
    prettier,
    tscOk,
    tscOutputStream,
  };
};
