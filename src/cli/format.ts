import { hasDebugFlag } from '../utils/args';
import { createLogger, log } from '../utils/logging';

import { runESLint } from './adapter/eslint';
import { runPrettier } from './adapter/prettier';

export const format = async () => {
  const debug = hasDebugFlag();

  log.newline();
  log.ok('Fixing code with ESLint');
  log.ok('-----------------------');

  const eslintOk = await runESLint('format', createLogger(debug));

  log.newline();
  log.ok('Formatting code with Prettier');
  log.ok('-----------------------------');

  const prettierOk = await runPrettier('format', createLogger(debug));

  log.newline();

  if (eslintOk && prettierOk) {
    return;
  }

  const tools = [
    ...(eslintOk ? [] : ['ESLint']),
    ...(prettierOk ? [] : ['Prettier']),
  ];

  log.err(tools.join(', '), 'found issues that require manual triage.');

  process.exitCode = 1;
};
