import { inspect } from 'util';

import { createExec } from '../../utils/exec.js';
import { log } from '../../utils/logging.js';
import { throwOnTimeout } from '../../utils/wait.js';

import { createAnnotations } from './annotate.js';

export const test = async () => {
  const argv = process.argv.slice(2);
  const customExec = createExec({
    // For some reason this impacts the ability for Vitest to find snapshot state
    preferLocal: false,
  });

  let result: { code: number } | undefined;
  try {
    result = await customExec('vitest', ...argv);
  } catch {
    process.exitCode = 1;
  }

  try {
    await throwOnTimeout(createAnnotations(result?.code === 0), { s: 30 });
  } catch (err) {
    log.warn('Failed to annotate test results.');
    log.subtle(inspect(err));
  }
};
