import { run } from 'jest';

export const test = () => {
  // This is usually set in `jest-cli`'s binary wrapper
  if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = 'test';
  }

  const argv = process.argv.slice(2);

  return run(argv);
};
