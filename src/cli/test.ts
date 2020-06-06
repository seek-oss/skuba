import { run } from 'jest';

export const test = () => {
  const argv = process.argv.slice(2);

  return run(argv);
};
