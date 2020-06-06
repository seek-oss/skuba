import chalk from 'chalk';

import { exec } from '../utils/exec';

export const format = async () => {
  await exec('eslint', '--ext=js,ts', '--fix', '.');
  console.log(chalk.green('✔ ESLint'));

  await exec('prettier', '--write', '.');
  console.log(chalk.green('✔ Prettier'));
};
