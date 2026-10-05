import { inspect, styleText } from 'util';

import { hasDebugFlag } from '../../utils/args.js';
import { isCiEnv } from '../../utils/env.js';
import { createExec } from '../../utils/exec.js';
import { childLogger, createLogger, log } from '../../utils/logging.js';
import { throwOnTimeout } from '../../utils/wait.js';
import { lint } from '../lint/index.js';
import { upgradeSkuba } from '../lint/internalLints/upgrade/index.js';

import { createAnnotations } from './annotate.js';

export const test = async () => {
  const argv = process.argv.slice(2);

  if (isCiEnv()) {
    const logger = createLogger({ debug: hasDebugFlag(argv) });

    try {
      const result = await upgradeSkuba(
        'format',
        childLogger(logger, { suffixes: [styleText('dim', 'upgrade-skuba')] }),
      );

      if (result.upgraded) {
        // Lint publishes the upgrade. `pendingChanges` covers the case where
        // that lint is clean and autofix would otherwise skip the push.
        await lint(argv, undefined, true, { pendingChanges: true });
      }
    } catch (error) {
      logger.warn('Failed to upgrade skuba before tests.');
      logger.subtle(inspect(error));
    }
  }

  const customExec = createExec({
    // For some reason this impacts the ability for Vitest to find snapshot state
    preferLocal: false,
  });

  let result: { exitCode?: number } | undefined;
  try {
    result = await customExec('vitest', ...argv);
  } catch {
    process.exitCode = 1;
  }

  try {
    await throwOnTimeout(createAnnotations(result?.exitCode === 0), { s: 30 });
  } catch (err) {
    log.warn('Failed to annotate test results.');
    log.subtle(inspect(err));
  }
};
