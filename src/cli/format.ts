import chalk from 'chalk';

import { handleCliError } from '../utils/error';
import { exec } from '../utils/exec';

const format = async () => {
  await exec('eslint', '--ext=js,ts', '--fix', '.');
  console.log(chalk.green('✔ ESLint'));

  await exec('prettier', '--write', '.');
  console.log(chalk.green('✔ Prettier'));
};

format().catch(handleCliError);
