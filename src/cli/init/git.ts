import os from 'os';
import path from 'path';

import { spinner } from '@clack/prompts';
import * as Git from '@skuba-lib/api/git';
import fs from 'fs-extra';
import git from 'isomorphic-git';
import { simpleGit } from 'simple-git';

import { copyFiles } from '../../utils/copy.ts';
import { isCiEnv } from '../../utils/env.ts';

/**
 * simple-git v4 strips `GIT_*` environment variables from the child process
 * unless they are explicitly allowed.
 *
 * In CI, `GIT_SSH_COMMAND` is retained so that custom SSH configuration (e.g.
 * a specific deploy key) is honoured when cloning from GitHub over SSH.
 */
const createGit = (baseDir?: string) =>
  simpleGit({
    ...(baseDir ? { baseDir } : {}),
    allowEnvironment: isCiEnv() ? ['GIT_SSH_COMMAND'] : [],
  });

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
  const s = spinner();
  s.start(`Downloading ${gitHubPath} from GitHub...`);

  try {
    await createGit().clone(
      `git@github.com:${gitHubPath}.git`,
      destinationDir,
      ['--depth=1', '--quiet'],
    );

    await fs.promises.rm(path.join(destinationDir, '.git'), {
      force: true,
      recursive: true,
    });

    s.stop(`Downloaded ${gitHubPath} from GitHub`);
  } catch (err) {
    s.error(`Failed to download ${gitHubPath} from GitHub`);
    throw err;
  }
};

export const listPrivateTemplates = async (): Promise<string[]> => {
  const repoUrl = 'git@github.com:SEEK-Jobs/skuba-templates.git';
  const tempDir = path.join(os.tmpdir(), `skuba-templates-list-${Date.now()}`);

  try {
    await createGit().clone(repoUrl, tempDir, [
      '--depth=1',
      '--filter=tree:0',
      '--no-checkout',
      '--quiet',
    ]);

    const output = await createGit(tempDir).raw([
      'ls-tree',
      '--name-only',
      '-d',
      'HEAD:templates',
    ]);

    return output.trim().split('\n').filter(Boolean).sort();
  } finally {
    await fs.promises.rm(tempDir, { recursive: true });
  }
};

export const downloadPrivateTemplate = async (
  templateName: string,
  destinationDir: string,
) => {
  const s = spinner();
  s.start(`Downloading ${templateName} from SEEK-Jobs/skuba-templates...`);

  const repoUrl = 'git@github.com:SEEK-Jobs/skuba-templates.git';
  const folderPath = `templates/${templateName}`;
  const tempDir = `${destinationDir}_temp`;

  try {
    await createGit().raw(['init', tempDir]);

    const sparseCheckoutPath = path.join(
      tempDir,
      '.git',
      'info',
      'sparse-checkout',
    );
    await fs.promises.writeFile(sparseCheckoutPath, `${folderPath}/*\n`);

    await createGit(tempDir)
      .raw(['config', 'core.sparseCheckout', 'true'])
      .addRemote('origin', repoUrl)
      .raw(['pull', 'origin', 'main', '--depth', '1', '--quiet']);

    const templatePath = path.join(tempDir, folderPath);

    try {
      await fs.promises.access(templatePath);
    } catch {
      throw new Error(`Template "${templateName}" not found in repository`);
    }

    await fs.ensureDir(destinationDir);

    await copyFiles({
      include: () => true,
      sourceRoot: templatePath,
      destinationRoot: destinationDir,
      processors: [],
      stripUnderscorePrefix: true,
    });

    await fs.promises.rm(tempDir, { force: true, recursive: true });
    s.stop(`Downloaded ${templateName} from SEEK-Jobs/skuba-templates`);
  } catch (error) {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
    s.error(
      `Failed to download ${templateName} from SEEK-Jobs/skuba-templates`,
    );
    throw error;
  }
};
