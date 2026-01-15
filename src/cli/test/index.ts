import { inspect, styleText } from 'util';

import { hasDebugFlag } from '../../utils/args.js';
import { isCiEnv } from '../../utils/env.js';
import { createExec } from '../../utils/exec.js';
import { childLogger, createLogger } from '../../utils/logging.js';
import { lint } from '../lint/index.js';
import { upgradeSkuba } from '../lint/internalLints/upgrade/index.js';

export const test = async () => {
  const argv = process.argv.slice(2);

  const nodeOptions = process.env.NODE_OPTIONS ?? '';

  if (isCiEnv()) {
    const logger = createLogger({ debug: hasDebugFlag(argv) });

    try {
      const result = await upgradeSkuba(
        'format',
        childLogger(logger, { suffixes: [styleText('dim', 'upgrade-skuba')] }),
      );

      if (result.upgraded) {
        await lint(argv);
      }
    } catch (error) {
      logger.warn('Failed to upgrade skuba before tests.');
      logger.subtle(inspect(error));
    }
  }

  const execWithEnv = createExec({
    env: {
      NODE_OPTIONS: !nodeOptions.includes('--experimental-vm-modules')
        ? `${nodeOptions} --experimental-vm-modules --no-warnings=ExperimentalWarning`
        : nodeOptions,
    },
  });

  // Run Jest in a child process with proper environment
  return execWithEnv(require.resolve('jest/bin/jest'), ...argv);
};
