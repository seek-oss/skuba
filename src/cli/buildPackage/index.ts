import { exec } from '../../utils/exec.js';

export const buildPackage = async () => {
  await exec('tsdown');
};
