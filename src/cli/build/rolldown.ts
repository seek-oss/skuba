import { exec } from '../../utils/exec.ts';

export const rolldown = async (args = process.argv.slice(2)) => {
  // Support additional arguments but enforce the use of a config file.
  // https://rolldown.rs/guide/getting-started#using-the-config-file
  await exec('rolldown', ...['--config', ...args]);
};
