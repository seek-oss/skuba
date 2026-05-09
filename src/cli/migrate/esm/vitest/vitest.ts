import path from 'node:path';

import fg from 'fast-glob';
import fs from 'fs-extra';
import latestVersion from 'latest-version';

import { createExec, exec } from '../../../../utils/exec.js';
import { getConsumerManifest } from '../../../../utils/manifest.js';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../../utils/packageManager.js';
import type { PatchReturnType } from '../../../lint/internalLints/upgrade/index.js';

import { postFixVitestMigration } from './postFixVitestMigration.js';
import { scaffoldVitestConfig } from './vitestConfig.js';

import { Git } from '@skuba-lib/api';

export type FileContent = {
  file: string;
  content: string;
};

const getLatestVitestKoaMocksVersion = async (): Promise<string> => {
  try {
    return await latestVersion('@skuba-lib/vitest-koa-mocks');
  } catch {
    return '1.0.1';
  }
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

const patchFiles = async ({
  packageJsons,
  pnpmWorkspaces,
  buildkitePipelines,
}: {
  packageJsons: FileContent[];
  pnpmWorkspaces: FileContent[];
  buildkitePipelines: FileContent[];
}): Promise<FileContent[]> => {
  const latestVitestKoaMocksVersion = await getLatestVitestKoaMocksVersion();
  const updatedPackageJsons = packageJsons
    .map(({ file, content }) => {
      const updatedContent = content
        .replace(
          /"aws-sdk-client-mock-jest":\s*"([^"]*)"/g,
          (_match, version: string) => {
            const newVersion = version.startsWith('catalog:')
              ? version
              : '7.0.1';
            return `"aws-sdk-client-mock-vitest": "${newVersion}"`;
          },
        )
        .replace(
          /"@shopify\/jest-koa-mocks":\s*"([^"]*)"/g,
          (_match, version: string) => {
            const newVersion = version.startsWith('catalog:')
              ? version
              : latestVitestKoaMocksVersion;
            return `"@skuba-lib/vitest-koa-mocks": "${newVersion}"`;
          },
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
          /'?@shopify\/jest-koa-mocks'?:\s*\S+/g,
          `'@skuba-lib/vitest-koa-mocks': ${latestVitestKoaMocksVersion}`,
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

export const migrateToVitest = async (opts: {
  mode: 'lint' | 'format';
  packageManager?: PackageManagerConfig;
}): Promise<PatchReturnType> => {
  const mode = opts.mode;
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

  const filesToUpdate = await patchFiles({
    packageJsons,
    pnpmWorkspaces,
    buildkitePipelines,
  });

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
          (content.includes('@skuba-lib/vitest-koa-mocks') ||
            content.includes('aws-sdk-client-mock-vitest')) &&
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

  const packageManager = opts.packageManager ?? (await detectPackageManager());

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
      // replace istanbul ignore with v8 ignore for coverage purposes
      const finalUpdated = updated
        .replace(
          /import\s+['"]aws-sdk-client-mock-jest['"];?/g,
          "import 'aws-sdk-client-mock-vitest/extend';",
        )
        .replace(/@shopify\/jest-koa-mocks/g, '@skuba-lib/vitest-koa-mocks')
        .replace(
          /\.mockImplementation\(\)/g,
          '.mockImplementation(() => undefined)',
        )
        .replace(/\.calls\[(\d+)\]\[/g, '.calls[$1]?.[')
        .replaceAll(
          'eslint-disable-next-line jest',
          'eslint-disable-next-line vitest',
        )
        .replaceAll('eslint-disable jest', 'eslint-disable vitest')
        .replaceAll('Mock<any, any>', 'Mock')
        .replaceAll('advanceTimers: true', 'shouldAdvanceTimers: true');

      if (finalUpdated !== content) {
        return fs.promises.writeFile(file, finalUpdated, 'utf8');
      }
    }),
  );

  const existingNodeTypesVersion = packageJsons
    .map(({ content }) => {
      const match = /"@types\/node":\s*"([^"]*)"/.exec(content);
      return match ? match[1] : null;
    })
    .find((version) => version !== null);

  const nodeTypeVersionToPatch = existingNodeTypesVersion ?? '24.12.2';

  const gitRoot = (await Git.findRoot({ dir: process.cwd() })) ?? process.cwd();

  await Promise.all(
    Array.from(vitestKoaMockPathsWithoutNodeTypes).map(async (folder) => {
      const manifest = await getConsumerManifest(folder);

      if (!manifest || manifest.packageJson.devDependencies?.['@types/node']) {
        return;
      }

      manifest.packageJson.devDependencies ??= {};
      manifest.packageJson.devDependencies['@types/node'] =
        nodeTypeVersionToPatch;

      await fs.promises.writeFile(
        manifest.path,
        JSON.stringify(manifest.packageJson, null, 2),
        'utf8',
      );
    }),
  );

  const rootExec = createExec({ cwd: gitRoot });

  await rootExec(
    packageManager.command,
    'install',
    '--frozen-lockfile=false',
    '--prefer-offline',
    '--ignore-scripts',
  );

  return {
    result: 'apply',
  };
};
