import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';
import simpleGit from 'simple-git';

import { log } from '../../utils/logging.js';

import { Git } from '@skuba-lib/api';

interface GitHubProject {
  orgName: string;
  repoName: string;
  defaultBranch: string;
}

export const initialiseRepo = async (
  dir: string,
  { orgName, repoName, defaultBranch }: GitHubProject,
) => {
  await git.init({
    defaultBranch,
    dir,
    fs,
  });

  await Git.commit({
    dir,
    message: 'Initial commit',
  });

  await git.addRemote({
    dir,
    fs,
    remote: 'origin',
    url: `git@github.com:${orgName}/${repoName}.git`,
  });
};

export const downloadGitHubTemplate = async (
  gitHubPath: string,
  destinationDir: string,
) => {
  log.newline();
  log.plain('Downloading', log.bold(gitHubPath), 'from GitHub...');

  await simpleGit().clone(`git@github.com:${gitHubPath}.git`, destinationDir, [
    '--depth=1',
    '--quiet',
  ]);

  await fs.promises.rm(path.join(destinationDir, '.git'), {
    force: true,
    recursive: true,
  });
};
