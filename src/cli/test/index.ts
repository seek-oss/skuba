import { createExec } from '../../utils/exec.js';

export const test = async () => {
  const argv = process.argv.slice(2);
  const customExec = createExec({
    // For some reason this impacts the ability for Vitest to find snapshot state
    preferLocal: false,
  });

  return customExec('vitest', ...argv);
};
