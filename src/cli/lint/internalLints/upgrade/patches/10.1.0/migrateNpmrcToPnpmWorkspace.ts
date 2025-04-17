/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { inspect } from 'util';

import { promises as fs } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const NPMRC = '.npmrc';

const clearManagedSection = (contents: string) => {
  let isInManagedSection = false;
  const lines = contents.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes('# managed by skuba')) isInManagedSection = true;
    if (isInManagedSection) {
      if (line.includes('# end managed by skuba')) isInManagedSection = false;
      lines[i] = '';
      // If we're now an empty line, remove it and get rid of the \ at the end of the previous line
      if (!lines[i]!.trim()) {
        lines.splice(i, 1);
        if (i > 0) {
          lines[i - 1] = lines[i - 1]!.replace(/\s*\\$/, '');
        }
        i--;
      } else if (lines[i] === '\\') {
        lines.splice(i, 1);
        i--;
      }
    }
  }
  return lines.join('\n');
};

const checkFileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

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

  const before = await fs.readFile(NPMRC, 'utf8');
  const after = clearManagedSection(before);

  if (before === after) {
    return {
      result: 'skip',
      reason: 'no managed section to clear',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await fs.writeFile(NPMRC, after);

  return { result: 'apply' };
};

export const tryMigrateNpmrcToPnpmWorkspace: PatchFunction = async (config) => {
  try {
    return await migrateNpmrcToPnpmWorkspace(config);
  } catch (err) {
    log.warn('Failed to clear managed section from .npmrc');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
