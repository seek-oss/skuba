import path from 'path';

import { Confirm } from 'enquirer';
import fs from 'fs-extra';

import { exec } from '../../utils/exec';
import { log } from '../../utils/logging';

import { diffFiles } from './analysis/project';

const CONFIRMATION_PROMPT = new Confirm({
  message: 'Apply changes?',
  name: 'confirmation',
});

interface Props {
  destinationRoot: string;
  entryPoint: string;
}

export const applyConfiguration = async (props: Props) => {
  const files = await diffFiles(props);

  log.newline();

  if (Object.keys(files).length === 0) {
    return log.ok('Project already configured.');
  }

  Object.entries(files)
    .sort(([filenameA], [filenameB]) => filenameA.localeCompare(filenameB))
    .forEach(([filename, { operation }]) => log.plain(operation, filename));

  log.newline();
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

  log.newline();
  log.ok('Project configured!');
  log.ok(`Try running ${log.bold('skuba format')}.`);
};
