import { exec } from '../../utils/exec';

import { parseTscArgs } from './args';

const DEFAULT_ARGS = ['--project', 'tsconfig.build.json'] as const;

export const tsc = async (args = process.argv.slice(2)) => {
  const tscArgs = parseTscArgs(args);

  // Build flag is incompatible with project flag
  const defaultArgs = tscArgs.build || tscArgs.project ? [] : DEFAULT_ARGS;

  return exec('tsc', ...defaultArgs, ...args);
};
