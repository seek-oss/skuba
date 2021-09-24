import { log } from '../../utils/logging';

import { runESLintInCurrentThread, runESLintInWorkerThread } from './eslint';
import {
  runPrettierInCurrentThread,
  runPrettierInWorkerThread,
} from './prettier';
import { runTscInNewProcess } from './tsc';
import type { Input } from './types';

const lintConcurrently = async (input: Input) => {
  const [eslintOk, prettierOk, tscOk] = await Promise.all([
    runESLintInWorkerThread(input),
    runPrettierInWorkerThread(input),
    runTscInNewProcess(input),
  ]);

  return { eslintOk, prettierOk, tscOk };
};

const lintSerially = async (input: Input) => {
  const eslintOk = await runESLintInCurrentThread(input);
  const prettierOk = await runPrettierInCurrentThread(input);
  const tscOk = await runTscInNewProcess(input);

  return { eslintOk, prettierOk, tscOk };
};

export const externalLint = async (input: Input) => {
  log.newline();

  const lint =
    // `--debug` implies `--serial`.
    input.debug || input.serial ? lintSerially : lintConcurrently;

  const { eslintOk, prettierOk, tscOk } = await lint(input);

  log.newline();

  if (eslintOk && prettierOk && tscOk) {
    return;
  }

  const tools = [
    ...(eslintOk ? [] : ['ESLint']),
    ...(prettierOk ? [] : ['Prettier']),
    ...(tscOk ? [] : ['tsc']),
  ];

  log.err(tools.join(', '), 'found issues that require triage.');
  log.newline();

  process.exitCode = 1;
};
