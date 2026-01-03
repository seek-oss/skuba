import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

import fs from 'fs-extra';
import git from 'isomorphic-git';
import { simpleGit } from 'simple-git';

import { log } from '../../utils/logging.js';

import * as Git from '@skuba-lib/api/git';

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

const execAsync = promisify(exec);

export const downloadPrivateTemplate = async (
  templateName: string,
  destinationDir: string,
) => {
  log.newline();
  log.plain(
    'Downloading',
    log.bold(templateName),
    'from SEEK-Jobs/skuba-templates',
  );

  const repoUrl = 'git@github.com:SEEK-Jobs/skuba-templates.git';
  const folderPath = `templates/${templateName}`;
  const tempDir = `${destinationDir}_temp`;

  try {
    await execAsync(`
      git init ${tempDir} &&
      git -C ${tempDir} config core.sparseCheckout true &&
      echo "${folderPath}/*" >> ${tempDir}/.git/info/sparse-checkout &&
      git -C ${tempDir} remote add origin ${repoUrl} &&
      git -C ${tempDir} pull origin main --depth 1 --quiet
    `);

    const templatePath = path.join(tempDir, folderPath);

    try {
      await fs.promises.access(templatePath);
    } catch {
      throw new Error(`Template "${templateName}" not found in repository`);
    }

    await fs.ensureDir(destinationDir);
    await fs.copy(templatePath, destinationDir);

    await fs.promises.rm(tempDir, { force: true, recursive: true });
  } catch (error) {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
    throw error;
  }
};
