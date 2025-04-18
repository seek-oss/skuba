import { inspect } from 'util';

import { promises as fs } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';
import { hasNpmrcSecret } from '../../../../../../utils/npmrc';
import { replaceManagedSection } from '../../../../../configure/processing/configFile';

const NPMRC = '.npmrc';

const checkFileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * TODO:
 * - Monorepos? Do we have setups with multiple .npmrc files? Do some repos skip running skuba lint/format in the root?
 * - Test whether deleting npmrc actually works locally and in CI
 * - Fix up Buildkite pipeline files & Dockerfiles referencing .npmrc
 * - Should we force upgrade to pnpm@10?
 */
const migrateNpmrcToPnpmWorkspace: PatchFunction = async ({
  mode,
  packageManager,
}): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not using pnpm',
    };
  }

  const npmrcExists = await checkFileExists(NPMRC);
  if (!npmrcExists) {
    return {
      result: 'skip',
      reason: 'no .npmrc found',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const contents = await fs.readFile(NPMRC, 'utf-8');

  const remainderLines = replaceManagedSection(contents, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !hasNpmrcSecret(line));

  if (remainderLines.length > 0) {
    // ensure pnpm-workspace.yaml exists
    const pnpmWorkspaceFile = 'pnpm-workspace.yaml';
    const pnpmWorkspaceExists = await checkFileExists(pnpmWorkspaceFile);
    if (!pnpmWorkspaceExists) {
      await fs.writeFile(pnpmWorkspaceFile, '');
    }

    // prepend the lines to the pnpm-workspace.yaml file, but commented out
    const pnpmWorkspaceContents = await fs.readFile(pnpmWorkspaceFile, 'utf-8');
    const commentedLines = remainderLines.map((line) => `# ${line}`).join('\n');
    const newContents = `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
${commentedLines}

${pnpmWorkspaceContents}`;

    await fs.writeFile(pnpmWorkspaceFile, newContents);
  }

  await fs.rm(NPMRC);

  return { result: 'apply' };
};

export const tryMigrateNpmrcToPnpmWorkspace: PatchFunction = async (config) => {
  try {
    return await migrateNpmrcToPnpmWorkspace(config);
  } catch (err) {
    log.warn('Failed to migrate .npmrc to pnpm-workspace.yaml');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
