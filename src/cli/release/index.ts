import { exec } from '../../utils/exec.ts';

export const release = async () => {
  await exec('semantic-release', '--success', 'false');
};
