import { inspect } from 'util';

import { Buildkite } from '../..';
import { log } from '../../utils/logging';

import { runESLintInCurrentThread, runESLintInWorkerThread } from './eslint';
import {
  runPrettierInCurrentThread,
  runPrettierInWorkerThread,
} from './prettier';
import { runTscInNewProcess } from './tsc';
import type { Input } from './types';

const lintConcurrently = async (input: Input) => {
  const [eslint, prettier, tscOk] = await Promise.all([
    runESLintInWorkerThread(input),
    runPrettierInWorkerThread(input),
    runTscInNewProcess(input),
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

  const lint =
    // `--debug` implies `--serial`.
    input.debug || input.serial ? lintSerially : lintConcurrently;

  const { eslint, prettier, tscOk } = await lint(input);

  log.newline();

  if (eslint.ok && prettier.ok && tscOk) {
    return;
  }

  const tools = [
    ...(eslint.ok ? [] : ['ESLint']),
    ...(prettier.ok ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

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
                [filepath, ...(err ? [inspect(err)] : [])].join(' '),
              )
              .join('\n'),
          ),
        ]),
    // TODO: provide richer error information from `tsc`.
    // This is tricky at the moment because we run `tsc` as a CLI in a separate
    // process and do not intercept its output stream.
    ...(tscOk ? [] : ['**tsc** build failed.']),
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-lint-external',
    scopeContextToStep: true,
    style: 'error',
  });

  process.exitCode = 1;
};
