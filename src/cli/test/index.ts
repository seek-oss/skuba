import { createExec } from '../../utils/exec.js';

export const test = async () => {
  const argv = process.argv.slice(2);

  const nodeOptions = process.env.NODE_OPTIONS ?? '';

  const execWithEnv = createExec({
    env: {
      NODE_OPTIONS: !nodeOptions?.includes('--experimental-vm-modules')
        ? `${nodeOptions} --experimental-vm-modules`
        : nodeOptions,
    },
  });

  // Run Jest in a child process with proper environment
  return execWithEnv(require.resolve('jest/bin/jest'), ...argv);
};
