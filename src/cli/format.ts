import chalk from 'chalk';

import { createExec } from '../utils/exec';

export const format = async () => {
  const exec = createExec({ pnp: true });

  await exec('eslint', '--ext=js,ts', '--fix', '.');
  console.log(chalk.green('✔ ESLint'));

  await exec('prettier', '--write', '.');
  console.log(chalk.green('✔ Prettier'));
};
