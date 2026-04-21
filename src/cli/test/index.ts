import { createExec } from '../../utils/exec.js';

export const test = async () => {
  const argv = process.argv.slice(2);
  const customExec = createExec({
    localDir: process.cwd(),
  });

  return customExec('vitest', ...argv);
};
