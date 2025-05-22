import { run } from 'jest';

export const test = async () => {
  // This is usually set in `jest-cli`'s binary wrapper
  process.env.NODE_ENV ??= 'test';

  // ts-jest is logging a warning about `isolatedModules`.
  // This is a workaround until we can remove the `isolatedModules` option.
  // https://github.com/seek-oss/skuba/issues/1841
  process.env.TS_JEST_LOG ??= 'stdout:error';

  const argv = process.argv.slice(2);

  return run(argv);
};
