import stream from 'stream';

import { runESLintInCurrentThread, runESLintInWorkerThread } from './eslint.js';
import {
  runPrettierInCurrentThread,
  runPrettierInWorkerThread,
} from './prettier.js';
import { runTscInNewProcess } from './tsc.js';
import type { Input } from './types.js';

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

  return {
    eslint,
    prettier,
    tscOk,
    tscOutputStream,
  };
};
