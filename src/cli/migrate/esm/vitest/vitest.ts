import path from 'node:path';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { createExec, exec } from '../../../../utils/exec.js';
import { detectPackageManager } from '../../../../utils/packageManager.js';
import type { PatchReturnType } from '../../../lint/internalLints/upgrade/index.js';

import { postFixVitestMigration } from './postFixVitestMigration.js';
import { scaffoldVitestConfig } from './vitestConfig.js';

export type FileContent = {
  file: string;
  content: string;
};

export const readFiles = async (paths: string[]): Promise<FileContent[]> =>
  Promise.all(
    paths.map(async (file) => {
      const content = await fs.promises.readFile(file, 'utf8');
      return {
        file,
        content,
      };
    }),
  );

const patchFiles = async (): Promise<FileContent[]> => {
  const [packageJsonFiles, pnpmWorkspaceFiles, buildkiteFiles] =
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
    ]);

  const [packageJsons, pnpmWorkspaces, buildkitePipelines] = await Promise.all([
    readFiles(packageJsonFiles),
    readFiles(pnpmWorkspaceFiles),
    readFiles(buildkiteFiles),
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
        .replace(/--runInBand/g, '--maxWorkers=1')
        .replace(/jest.config/g, 'vitest.config');

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
      const updatedContent = content
        .replace(/--runInBand/g, '--maxWorkers=1')
        .replace(/jest.config/g, 'vitest.config');
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
  ];
};

export const migrateToVitest = async ({
  mode,
}: {
  mode: 'lint' | 'format';
}): Promise<PatchReturnType> => {
  // Adding `vitest.config.ts` to all the integration tests causes the vscode extension
  // to freak out about having too many vitest configs
  if (process.env.SKUBA_INT_TEST === 'true') {
    return {
      result: 'skip',
      reason: 'skipping in integration test environment',
    };
  }

  const vitestConfigFiles = await fg(['**/vitest.config.{ts,js,mjs,mts,cts}'], {
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

  const vitestKoaMockPathsWithoutNodeTypes = new Set(
    filesToUpdate
      .filter(
        ({ content }) =>
          content.includes('@skuba-lib/vitest-koa-mocks') &&
          !content.includes('@types/node'),
      )
      .map(({ file }) => path.dirname(file)),
  );

  const configFilesToUpdate = await scaffoldVitestConfig();

  if (configFilesToUpdate.length && mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const folders = configFilesToUpdate.map(({ file }) => path.dirname(file));
  const uniqueFolders = Array.from(new Set(folders));

  await Promise.all(
    uniqueFolders.map((folder) =>
      fs.promises.mkdir(folder, { recursive: true }),
    ),
  );

  await Promise.all(
    configFilesToUpdate.map(({ file, content }) =>
      fs.promises.writeFile(file, content, 'utf8'),
    ),
  );

  const packageManager = await detectPackageManager();

  if (packageManager.command === 'pnpm') {
    await exec('pnpm', 'dlx', '@sku-lib/codemod', 'jest-to-vitest', '.');
  } else {
    await exec('npx', '@sku-lib/codemod', 'jest-to-vitest', '.');
  }

  // The sku migration doesn't handle async hooks nicely so we have to go back and re-patch them
  const tsFilePaths = await fg(['**/*.ts', '**/*.tsx'], {
    ignore: ['**/.git', '**/node_modules'],
  });
  const tsFiles = await readFiles(tsFilePaths);

  await Promise.all(
    tsFiles.map(async ({ file, content }) => {
      const updated = await postFixVitestMigration(file, content);
      // replace import 'aws-sdk-client-mock-jest'; with import 'aws-sdk-client-mock-vitest/extend';
      // replace imports from @shopify/jest-koa-mocks with @skuba-lib/vitest-koa-mocks
      // replace .mockImplementation() with .mockImplementation(() => undefined) to account for the fact that Vitest requires an implementation for mocks whereas Jest does not
      const finalUpdated = updated
        .replace(
          /import\s+['"]aws-sdk-client-mock-jest['"];?/g,
          "import 'aws-sdk-client-mock-vitest/extend';",
        )
        .replace(/@shopify\/jest-koa-mocks/g, '@skuba-lib/vitest-koa-mocks')
        .replace(
          /\.mockImplementation\(\)/g,
          '.mockImplementation(() => undefined)',
        );

      if (finalUpdated !== content) {
        return fs.promises.writeFile(file, finalUpdated, 'utf8');
      }
    }),
  );

  // Install the new deps we added to package.json
  if (packageManager.command === 'pnpm') {
    await exec('pnpm', 'install', '--no-frozen-lockfile', '--prefer-offline');
    await Promise.all(
      Array.from(vitestKoaMockPathsWithoutNodeTypes).map(async (folder) => {
        const folderExec = createExec({
          cwd: folder,
        });

        return folderExec(
          'pnpm',
          'install',
          '@types/node@24.12.2',
          '--save-dev',
          '--prefer-offline',
          '--ignore-workspace-root-check',
        );
      }),
    );
    await exec('pnpm', 'dedupe', '--prefer-offline');
  } else {
    await exec('yarn', 'install', '--prefer-offline');
    await Promise.all(
      Array.from(vitestKoaMockPathsWithoutNodeTypes).map(async (folder) => {
        const folderExec = createExec({
          cwd: folder,
        });

        return folderExec(
          'yarn',
          'add',
          '@types/node@24.12.2',
          '--dev',
          '--prefer-offline',
        );
      }),
    );
  }

  return {
    result: 'apply',
  };
};
