import { exec } from '../../utils/exec';

export const release = async () => {
  await exec('semantic-release', '--success', 'false');
};
