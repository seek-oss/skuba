import path from 'path';

import chalk from 'chalk';
import { Confirm } from 'enquirer';
import fs from 'fs-extra';

import { exec } from '../../utils/exec';

import { FileDiff } from './types';

const CONFIRMATION_PROMPT = new Confirm({
  message: 'Apply changes?',
  name: 'confirmation',
});

interface Props {
  files: FileDiff;
}

export const applyConfiguration = async ({ files }: Props) => {
  if (Object.keys(files).length === 0) {
    return console.log(chalk.green('Project already configured.'));
  }

  Object.entries(files)
    .sort(([filenameA], [filenameB]) => filenameA.localeCompare(filenameB))
    .forEach(([filename, { operation }]) =>
      console.log(`${operation} ${filename}`),
    );

  console.log();

  const shouldContinue = await CONFIRMATION_PROMPT.run();

  if (!shouldContinue) {
    return;
  }

  const dirnames = [
    ...new Set(Object.keys(files).map((filename) => path.dirname(filename))),
  ];

  await Promise.all(dirnames.map((dirname) => fs.ensureDir(dirname)));

  await Promise.all(
    Object.entries(files).map(([filename, { data }]) =>
      typeof data === 'undefined'
        ? fs.remove(filename)
        : fs.writeFile(filename, data),
    ),
  );

  await exec('yarn', 'install', '--silent');

  console.log();
  console.log(chalk.green('Project configured!'));
  console.log();
  console.log(`Try running ${chalk.bold('skuba format')}.`);
};
