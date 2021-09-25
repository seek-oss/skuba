import stream from 'stream';

import { Buildkite } from '../..';
import { log } from '../../utils/logging';

import { runESLintInCurrentThread, runESLintInWorkerThread } from './eslint';
import {
  runPrettierInCurrentThread,
  runPrettierInWorkerThread,
} from './prettier';
import { runTscInNewProcess } from './tsc';
import type { Input } from './types';

class StreamInterceptor extends stream.Transform {
  private chunks: Uint8Array[] = [];

  public output() {
    return Buffer.concat(this.chunks).toString();
  }

  _transform(
    chunk: any,
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

const lintSerially = async (input: Input) => {
  const eslint = await runESLintInCurrentThread(input);
  const prettier = await runPrettierInCurrentThread(input);
  const tscOk = await runTscInNewProcess(input);

  return { eslint, prettier, tscOk };
};

export const externalLint = async (input: Input) => {
  log.newline();

  // `--debug` implies `--serial`.
  const isSerial = input.debug || input.serial;

  const lint = isSerial ? lintSerially : lintConcurrently;

  const tscOutputStream = new StreamInterceptor();
  tscOutputStream.pipe(input.tscOutputStream ?? process.stdout);

  const { eslint, prettier, tscOk } = await lint({ ...input, tscOutputStream });

  if (eslint.ok && prettier.ok && tscOk) {
    return;
  }

  const tools = [
    ...(eslint.ok ? [] : ['ESLint']),
    ...(prettier.ok ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

  log.newline();
  log.err(tools.join(', '), 'found issues that require triage.');
  log.newline();

  const buildkiteOutput = [
    '`skuba lint` found issues that require triage:',
    ...(eslint.ok
      ? []
      : ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())]),
    ...(prettier.ok
      ? []
      : [
          '**Prettier**',
          Buildkite.md.terminal(
            prettier.result.errored
              .map(({ err, filepath }) =>
                [filepath, ...(err ? [String(err)] : [])].join(' '),
              )
              .join('\n'),
          ),
        ]),
    ...(tscOk
      ? []
      : [
          '**tsc**',
          Buildkite.md.terminal(
            tscOutputStream
              .output()
              .split('\n')
              .filter(Boolean)
              .map((line) => line.replace(/^tsc\s+\| /, ''))
              .filter((line) => !line.startsWith('TSFILE: '))
              .join('\n')
              .trim(),
          ),
        ]),
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-lint-external',
    scopeContextToStep: true,
    style: 'error',
  });

  process.exitCode = 1;
};
