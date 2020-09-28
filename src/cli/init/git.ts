import path from 'path';

import fs from 'fs-extra';

import { Exec, createExec } from '../../utils/exec';
import { log } from '../../utils/logging';

interface GitHubProject {
  orgName: string;
  repoName: string;
}

export const initialiseRepo = async (
  exec: Exec,
  { orgName, repoName }: GitHubProject,
) => {
  await exec('git', 'init');

  const result = await exec(
    'git',
    '-c',
    'user.email=<>',
    '-c',
    'user.name=skuba',
    'commit',
    '--allow-empty',
    '--author',
    'skuba <>',
    '--message',
    'Initial commit',
  );

  // For compatibility, otherwise we could use Git 2.28's init.defaultBranch
  if (result.stdout.includes('master')) {
    await exec('git', 'checkout', '-b', 'main');
    await exec('git', 'branch', '-D', 'master');
  }

  await exec(
    'git',
    'remote',
    'add',
    'origin',
    `git@github.com:${orgName}/${repoName}.git`,
  );
};

export const commitChanges = async (exec: Exec, message: string) => {
  await exec('git', 'add', '--all');

  await exec(
    'git',
    '-c',
    'user.email=<>',
    '-c',
    'user.name=skuba',
    'commit',
    '--author',
    'skuba <>',
    '--message',
    message,
    '--quiet',
  );
};

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
    log.bold('yarn skuba configure'),
    'once this is done.',
  );
};
