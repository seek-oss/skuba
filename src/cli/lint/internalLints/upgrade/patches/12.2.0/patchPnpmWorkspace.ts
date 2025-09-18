import { inspect } from 'util';

import fs from 'fs-extra';

import {
  checkFileExists,
  findCurrentWorkspaceProjectRoot,
  findWorkspaceRoot,
} from '../../../../../../utils/dir.js';
import { log } from '../../../../../../utils/logging.js';
import type { PackageManagerConfig } from '../../../../../../utils/packageManager.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const patchPnpmWorkspace = async (
  mode: 'lint' | 'format',
  packageManager: PackageManagerConfig,
): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not using pnpm',
    };
  }

  const [workspaceRoot, currentWorkspaceProjectRoot] = await Promise.all([
    findWorkspaceRoot(),
    findCurrentWorkspaceProjectRoot(),
  ]);

  if (workspaceRoot !== currentWorkspaceProjectRoot) {
    return {
      result: 'skip',
      reason: 'not running in the workspace root',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const pnpmWorkspaceFile = 'pnpm-workspace.yaml';
  const pnpmWorkspaceExists = await checkFileExists(pnpmWorkspaceFile);
  if (!pnpmWorkspaceExists) {
    await fs.writeFile(pnpmWorkspaceFile, '');
  }

  const pnpmWorkspaceContents = await fs.readFile(pnpmWorkspaceFile, 'utf-8');

  if (
    pnpmWorkspaceContents.includes('minimumReleaseAge') ||
    pnpmWorkspaceContents.includes('minimumReleaseAgeExclude')
  ) {
    return {
      result: 'skip',
      reason: '`minimumReleaseAge` already exists in pnpm-workspace.yaml',
    };
  }

  const newContents = `${pnpmWorkspaceContents}
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@seek/*'
  - '*skuba*'
  - '*seek*'
`;

  await fs.writeFile(pnpmWorkspaceFile, newContents);

  return {
    result: 'apply',
  };
};

export const tryPatchPnpmWorkspace: PatchFunction = async ({
  mode,
  packageManager,
}) => {
  try {
    return await patchPnpmWorkspace(mode, packageManager);
  } catch (err) {
    log.warn('Failed to apply `pnpm-workspace.yaml` patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
