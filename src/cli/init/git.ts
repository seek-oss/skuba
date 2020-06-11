import path from 'path';

import fs from 'fs-extra';

import { createExec } from '../../utils/exec';
import { log } from '../../utils/logging';

export const downloadGitHubTemplate = async (
  gitHubPath: string,
  destinationDir: string,
) => {
  const exec = createExec({ cwd: destinationDir });

  log.newline();
  log.plain('Downloading', log.bold(gitHubPath), 'from GitHub...');

  await exec(
    'git',
    'clone',
    '--depth=1',
    '--quiet',
    `git@github.com:${gitHubPath}.git`,
    '.',
  );

  await fs.remove(path.join(destinationDir, '.git'));

  log.newline();
  log.warn(
    'You may need to run',
    log.bold('skuba configure'),
    'once this is done.',
  );
};
