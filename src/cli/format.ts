import { exec } from '../utils/exec';
import { log } from '../utils/logging';

export const format = async () => {
  await exec('eslint', '--ext=js,ts,tsx', '--fix', '.');
  log.ok('✔ ESLint');

  await exec('prettier', '--write', '.');
  log.ok('✔ Prettier');
};
