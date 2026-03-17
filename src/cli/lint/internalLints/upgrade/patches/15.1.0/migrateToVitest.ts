import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const replacePackage = async (): Promise<
  Array<{
    file: string;
    content: string;
  }>
> => {
  const [packageJsonFiles, pnpmWorkspaceFiles] = await Promise.all([
    fg(['**/package.json'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    fg(['**/pnpm-workspace.yaml'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  const [packageJsons, pnpmWorkspaces] = await Promise.all([
    Promise.all(
      packageJsonFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf8');
        return {
          file,
          content,
        };
      }),
    ),
    Promise.all(
      pnpmWorkspaceFiles.map(async (file) => {
        const content = await fs.promises.readFile(file, 'utf8');
        return {
          file,
          content,
        };
      }),
    ),
  ]);
  const updatedpackageJsons = packageJsons
    .map(({ file, content }) => {
      // replace aws-sdk-client-mock-jest with aws-sdk-client-mock-vitest 7.0.1
      const updatedContent = content.replace(
        /"aws-sdk-client-mock-jest":\s*"[^"]*"/g,
        '"aws-sdk-client-mock-vitest": "7.0.1"',
      );

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter(
      (file): file is { file: string; content: string } =>
        file.content !== undefined,
    );

  const updatedPnpmWorkspaces = pnpmWorkspaces
    .map(({ file, content }) => {
      // replace aws-sdk-client-mock-jest with aws-sdk-client-mock-vitest 7.0.1
      const updatedContent = content.replace(
        /aws-sdk-client-mock-jest:\s*\S+/g,
        'aws-sdk-client-mock-vitest: 7.0.1',
      );

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter(
      (file): file is { file: string; content: string } =>
        file.content !== undefined,
    );

  const updatedFiles = [...updatedpackageJsons, ...updatedPnpmWorkspaces];

  if (!updatedFiles.length) {
    return [];
  }

  // update typescript file references from aws-sdk-client-mock-jest to aws-sdk-client-mock-vitest
  const tsFilePaths = await fg(['**/*.ts', '**/*.tsx'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  const tsFiles = await Promise.all(
    tsFilePaths.map(async (file) => {
      const content = await fs.promises.readFile(file, 'utf8');

      // replace import 'aws-sdk-client-mock-jest'; with import 'aws-sdk-client-mock-vitest/extend';
      const updatedContent = content.replace(
        /import\s+['"]aws-sdk-client-mock-jest['"];?/g,
        "import 'aws-sdk-client-mock-vitest/extend';",
      );

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    }),
  );

  const updatedTsFiles = tsFiles.filter(
    (file): file is { file: string; content: string } =>
      file.content !== undefined,
  );

  return [...updatedFiles, ...updatedTsFiles];
};

export const migrateToVitest: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  // Adding `vitest.config.ts` to all the integration tests causes the vscode extension
  // to freak out about having too many vitest configs
  if (process.env.SKUBA_INT_TEST === 'true') {
    return {
      result: 'skip',
      reason: 'skipping in integration test environment',
    };
  }

  const vitestConfigFiles = await fg(['**/vitest.config.{ts,js,mts,cts}'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (vitestConfigFiles.length > 0) {
    return {
      result: 'skip',
      reason: 'vitest is already configured in this project',
    };
  }

  const filesToUpdate = await replacePackage();

  if (filesToUpdate.length && mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesToUpdate.map(({ file, content }) =>
      fs.promises.writeFile(file, content, 'utf8'),
    ),
  );

  const packageManager = await detectPackageManager();

  if (packageManager.command === 'pnpm') {
    // Hoist our new pnpm packages
    await patchPnpmWorkspace('format');
    await exec('pnpm', 'install', '--offline');
    await exec('pnpm', 'dlx', '@sku-lib/codemod', 'jest-to-vitest', '.');
  } else {
    await exec('npx', '@sku-lib/codemod', 'jest-to-vitest', '.');
  }

  return {
    result: 'apply',
  };
};

export const tryMigrateToVitest: PatchFunction = async (config) => {
  try {
    return await migrateToVitest(config);
  } catch (err) {
    log.warn('Failed to migrate to Vitest');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
