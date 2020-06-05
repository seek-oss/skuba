import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';

import { createExec } from '../../utils/exec';

export const downloadGitHubTemplate = async (
  gitHubPath: string,
  destinationDir: string,
) => {
  const exec = createExec({ cwd: destinationDir });

  console.log();
  console.log(`Downloading ${chalk.bold(gitHubPath)} from GitHub...`);

  await exec(
    'git',
    'clone',
    '--depth=1',
    '--quiet',
    `git@github.com:${gitHubPath}.git`,
    '.',
  );

  await fs.remove(path.join(destinationDir, '.git'));

  console.log();
  console.log(
    chalk.yellowBright(
      `You may need to run ${chalk.bold('skuba configure')} once this is done.`,
    ),
  );
};
