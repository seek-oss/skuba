import { exec } from '../../utils/exec.js';

const DEFAULT_ARGS = ['--project', 'tsconfig.build.json'] as const;

const PROJECT_OPTS = new Set([
  // Build flag is incompatible with project flag
  '-b',
  '-build',
  '--build',

  '-p',
  '-project',
  '--project',
]);

export const tsc = async () => {
  const args = process.argv.slice(2);

  const defaultArgs = args
    .map((arg) => arg.toLocaleLowerCase())
    .some((arg) => PROJECT_OPTS.has(arg))
    ? []
    : DEFAULT_ARGS;

  return exec('tsc', ...defaultArgs, ...args);
};
