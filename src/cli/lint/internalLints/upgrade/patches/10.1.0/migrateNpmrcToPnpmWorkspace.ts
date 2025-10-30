import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import {
  findCurrentWorkspaceProjectRoot,
  findWorkspaceRoot,
} from '../../../../../../utils/dir.js';
import { pathExists } from '../../../../../../utils/fs.js';
import { log } from '../../../../../../utils/logging.js';
import { hasNpmrcSecret } from '../../../../../../utils/npmrc.js';
import { replaceManagedSection } from '../../../../../configure/processing/configFile.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const NPMRC = '.npmrc';

const migrateCustomNpmrcSettings = async () => {
  const contents = await fs.readFile(NPMRC, 'utf-8');

  const remainderLines = replaceManagedSection(contents, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !hasNpmrcSecret(line));

  if (remainderLines.length === 0) {
    return;
  }

  const pnpmWorkspaceFile = 'pnpm-workspace.yaml';
  const pnpmWorkspaceExists = await pathExists(pnpmWorkspaceFile);
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
};

const fixDockerfiles = async () => {
  const fileNames = await glob(['**/Dockerfile*']);

  await Promise.all(
    fileNames.map(async (fileName) => {
      const contents = await fs.readFile(fileName, 'utf8');
      const patched = contents.replaceAll(
        '--mount=type=bind,source=.npmrc,target=.npmrc',
        '--mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml',
      );

      if (patched !== contents) {
        await fs.writeFile(fileName, patched);
      }
    }),
  );
};

const fixBuildkitePipelines = async () => {
  const fileNames = await glob(['**/.buildkite/**.{yml,yaml}']);

  await Promise.all(
    fileNames.map(async (fileName) => {
      const contents = await fs.readFile(fileName, 'utf8');
      const patched = contents.replace(
        /(cache-on:[\s\S]*?)([ \t]+-[ \t]+\.npmrc)([\s\S]*?)(?=\n[ \t]*\S|$)/g,
        (_, before: string, npmrcLine: string, after: string) =>
          before + npmrcLine.replace('.npmrc', 'pnpm-workspace.yaml') + after,
      );

      if (patched !== contents) {
        await fs.writeFile(fileName, patched);
      }
    }),
  );
};

const forceUpgradeToPnpm10 = async () => {
  const fileNames = await glob(['**/package.json']);

  await Promise.all(
    fileNames.map(async (fileName) => {
      const contents = await fs.readFile(fileName, 'utf8');

      const packageManagerMatch = /"packageManager"\s*:\s*"pnpm@([^"]+)"/.exec(
        contents,
      );

      if (!packageManagerMatch) {
        return;
      }

      const currentVersion = packageManagerMatch[1] ?? '';
      const majorVersion = parseInt(currentVersion.split('.')?.[0] ?? '0', 10);

      if (!isNaN(majorVersion) && majorVersion < 10) {
        const patched = contents.replace(
          /"packageManager"(\s*):(\s*)"pnpm@[^"]+"/,
          '"packageManager"$1:$2"pnpm@10.8.1"',
        );

        await fs.writeFile(fileName, patched);
      }
    }),
  );
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

  const npmrcExists = await pathExists(NPMRC);
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

  await Promise.all([
    migrateCustomNpmrcSettings(),
    fixDockerfiles(),
    fixBuildkitePipelines(),
    forceUpgradeToPnpm10(),
  ]);

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
