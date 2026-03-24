import { exec } from '../../utils/exec.js';

export const test = async () => {
  const argv = process.argv.slice(2);

  return exec('vitest', ...argv);
};
