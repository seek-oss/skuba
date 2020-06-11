import { exec } from '../utils/exec';

export const release = async () => {
  await exec('semanticRelease', '--success', 'false');
};
