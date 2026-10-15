import { exec } from '../../utils/exec.ts';

export const buildPackage = async (args = process.argv.slice(2)) => {
  await exec('tsdown', ...args);
};
