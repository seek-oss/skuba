import { exec } from '../../utils/exec.js';

const hasConfigFlag = (args: string[]) =>
  args.some(
    (arg) =>
      arg === '--config' ||
      arg === '-c' ||
      arg.startsWith('--config=') ||
      arg.startsWith('-c='),
  );

export const rolldown = async (args = process.argv.slice(2)) => {
  // Support additional arguments but enforce the use of a config file.
  // https://rolldown.rs/guide/getting-started#using-the-config-file
  const configArgs = hasConfigFlag(args) ? args : ['--config', ...args];

  await exec('rolldown', ...configArgs);
};
