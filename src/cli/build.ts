import { handleCliError } from '../utils/error';
import { exec } from '../utils/exec';

const DEFAULT_ARGS = ['--project', 'tsconfig.build.json'] as const;

const PROJECT_OPTS = new Set(['-p', '-project', '--project']);

const build = async () => {
  const args = process.argv.slice(2);

  const defaultArgs = args
    .map((arg) => arg.toLocaleLowerCase())
    .some((arg) => PROJECT_OPTS.has(arg))
    ? []
    : DEFAULT_ARGS;

  return exec('tsc', ...defaultArgs, ...args);
};

build().catch(handleCliError);
