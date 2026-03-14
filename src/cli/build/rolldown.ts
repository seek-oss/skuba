import { exec } from '../../utils/exec.js';

export const rolldown = async (args = process.argv.slice(2)) => {
  await exec('rolldown', ...['-c', ...args]);
};
