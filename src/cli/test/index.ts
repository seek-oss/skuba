import { run } from 'jest';

import { tryAddEmptyExports } from '../configure/addEmptyExports';

export const test = async () => {
  await tryAddEmptyExports();

  // This is usually set in `jest-cli`'s binary wrapper
  process.env.NODE_ENV ??= 'test';

  const argv = process.argv.slice(2);

  return run(argv);
};
