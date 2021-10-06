import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { crawlDirectory } from 'utils/dir';

import { log } from '../../utils/logging';

interface GitHubProject {
  orgName: string;
  repoName: string;
}

export const initialiseRepo = async (
  dir: string,
  { orgName, repoName }: GitHubProject,
) => {
  await git.init({
    // TODO: support main as an alternative.
    defaultBranch: 'master',
    dir,
    fs,
  });

  await git.commit({
    author: { name: 'skuba' },
    committer: { name: 'skuba' },
    dir,
    fs,
    message: 'Initial commit',
  });

  await git.addRemote({
    dir,
    fs,
    remote: 'origin',
    url: `git@github.com:${orgName}/${repoName}.git`,
  });
};

export const commitChanges = async (dir: string, message: string) => {
  const filepaths = await crawlDirectory(dir);

  await Promise.all(
    filepaths.map((filepath) => git.add({ dir, filepath, fs })),
  );

  await git.commit({
    author: { name: 'skuba' },
    committer: { name: 'skuba' },
    dir,
    fs,
    message,
  });
};

export const downloadGitHubTemplate = async (
  gitHubPath: string,
  destinationDir: string,
) => {
  log.newline();
  log.plain('Downloading', log.bold(gitHubPath), 'from GitHub...');

  await git.clone({
    depth: 1,
    dir: destinationDir,
    fs,
    http,
    singleBranch: true,
    url: `git@github.com:${gitHubPath}.git`,
  });

  await fs.promises.rm(path.join(destinationDir, '.git'), {
    force: true,
    recursive: true,
  });

  log.newline();
  log.warn(
    'You may need to run',
    log.bold('yarn skuba configure'),
    'once this is done.',
  );
};
