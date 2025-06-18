import { exec } from '../../utils/exec.js';

export const release = async () => {
  await exec('semantic-release', '--success', 'false');
};
