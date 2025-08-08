import { createExec } from '../../utils/exec.js';

export const test = async () => {
  const argv = process.argv.slice(2);

  // Prepare environment variables for Jest
  const nodeOptions = process.env.NODE_OPTIONS ?? '';

  const execWithEnv = createExec({
    env: {
      // This is usually set in `jest-cli`'s binary wrapper
      NODE_ENV: process.env.NODE_ENV ?? 'test',

      // ts-jest is logging a warning about `isolatedModules`.
      // This is a workaround until we can remove the `isolatedModules` option.
      // https://github.com/seek-oss/skuba/issues/1841
      TS_JEST_LOG: process.env.TS_JEST_LOG ?? 'stdout:error',

      NODE_OPTIONS: !nodeOptions?.includes('--experimental-vm-modules')
        ? `${nodeOptions} --experimental-vm-modules`
        : nodeOptions,
    },
  });

  // Run Jest in a child process with proper environment
  return execWithEnv(require.resolve('jest/bin/jest'), ...argv);
};
