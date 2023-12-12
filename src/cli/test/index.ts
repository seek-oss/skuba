import { run } from 'jest';

export const test = async () => {
  // This is usually set in `jest-cli`'s binary wrapper
  process.env.NODE_ENV ??= 'test';

  const argv = process.argv.slice(2);

  return run(argv);
};
