import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

type FileContent = {
  file: string;
  content: string;
};

const patchFiles = async (): Promise<FileContent[]> => {
  const [packageJsonFiles, pnpmWorkspaceFiles, buildkiteFiles, tsFilePaths] =
    await Promise.all([
      fg(['**/package.json'], {
        ignore: ['**/.git', '**/node_modules'],
      }),
      fg(['**/pnpm-workspace.yaml'], {
        ignore: ['**/.git', '**/node_modules'],
      }),
      fg(['**/.buildkite/**/*.{yml,yaml}'], {
        ignore: ['**/.git', '**/node_modules'],
      }),
      fg(['**/*.ts', '**/*.tsx'], {
        ignore: ['**/.git', '**/node_modules'],
      }),
    ]);

  const [packageJsons, pnpmWorkspaces, buildkitePipelines, tsFiles] =
    await Promise.all([
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
      Promise.all(
        buildkiteFiles.map(async (file) => {
          const content = await fs.promises.readFile(file, 'utf8');
          return {
            file,
            content,
          };
        }),
      ),
      Promise.all(
        tsFilePaths.map(async (file) => {
          const content = await fs.promises.readFile(file, 'utf8');
          return {
            file,
            content,
          };
        }),
      ),
    ]);

  const updatedPackageJsons = packageJsons
    .map(({ file, content }) => {
      const updatedContent = content
        .replace(
          /"aws-sdk-client-mock-jest":\s*"[^"]*"/g,
          '"aws-sdk-client-mock-vitest": "7.0.1"',
        )
        .replace(
          /"@shopify\/jest-koa-mocks":\s*"[^"]*"/g,
          '"@skuba-lib/vitest-koa-mocks": "1.0.1"',
        )
        .replace(/--runInBand/g, '--maxWorkers=1');

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter((file): file is FileContent => file.content !== undefined);

  const updatedPnpmWorkspaces = pnpmWorkspaces
    .map(({ file, content }) => {
      const updatedContent = content
        .replace(
          /aws-sdk-client-mock-jest:\s*\S+/g,
          'aws-sdk-client-mock-vitest: 7.0.1',
        )
        .replace(
          /@shopify\/jest-koa-mocks:\s*\S+/g,
          '@skuba-lib/vitest-koa-mocks: 1.0.1',
        );

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter((file): file is FileContent => file.content !== undefined);

  const updatedBuildkiteFiles = buildkitePipelines
    .map(({ file, content }) => {
      const updatedContent = content.replace(/--runInBand/g, '--maxWorkers=1');
      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter((file): file is FileContent => file.content !== undefined);

  // replace import 'aws-sdk-client-mock-jest'; with import 'aws-sdk-client-mock-vitest/extend';
  // replace imports from @shopify/jest-koa-mocks with @skuba-lib/vitest-koa-mocks
  const updatedTsFiles = tsFiles
    .map(({ file, content }) => {
      const updatedContent = content
        .replace(
          /import\s+['"]aws-sdk-client-mock-jest['"];?/g,
          "import 'aws-sdk-client-mock-vitest/extend';",
        )
        .replace(/@shopify\/jest-koa-mocks/g, '@skuba-lib/vitest-koa-mocks')
        .replace(
          /\.mockImplementation\(\)/g,
          '.mockImplementation(() => {\n  /* empty */\n})',
        );

      return {
        file,
        content: updatedContent === content ? undefined : updatedContent,
      };
    })
    .filter((file): file is FileContent => file.content !== undefined);

  return [
    ...updatedPackageJsons,
    ...updatedPnpmWorkspaces,
    ...updatedBuildkiteFiles,
    ...updatedTsFiles,
  ];
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

  const filesToUpdate = await patchFiles();

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
