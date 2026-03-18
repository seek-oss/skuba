import { type SgNode, parse } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../utils/exec.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import { getCustomConditions } from '../build/tsc.js';
import type { PatchReturnType } from '../lint/internalLints/upgrade/index.js';

import { Git } from '@skuba-lib/api';
import { getOwnerAndRepo } from '@skuba-lib/api/git';
type FileContent = {
  file: string;
  content: string;
};

const readFiles = async (paths: string[]): Promise<FileContent[]> =>
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
      readFiles(packageJsonFiles),
      readFiles(pnpmWorkspaceFiles),
      readFiles(buildkiteFiles),
      readFiles(tsFilePaths),
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

const extractCoverageThreshold = (node: SgNode): string | undefined => {
  const coverageThreshold = node.find({
    rule: {
      kind: 'property_identifier',
      regex: '^coverageThreshold$',
    },
  });

  const global = coverageThreshold?.parent()?.find({
    rule: {
      kind: 'property_identifier',
      regex: '^global$',
    },
  });

  const globalObject = global
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'object');

  return globalObject?.text();
};

const extractCoverageIgnorePaths = (node: SgNode): string | undefined => {
  const coveragePathIgnorePatterns = node.find({
    rule: {
      kind: 'property_identifier',
      regex: '^coveragePathIgnorePatterns$',
    },
  });

  const arrayObject = coveragePathIgnorePatterns
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'array');

  return arrayObject?.text();
};

const determineCustomConditions = async (): Promise<string[]> => {
  const gitRoot = await Git.findRoot({ dir: process.cwd() });
  const projectRoot = gitRoot ?? process.cwd();
  const maybeTsconfigCustomConditions = getCustomConditions(projectRoot);

  let customConditions: string[];
  if (maybeTsconfigCustomConditions.length) {
    customConditions = maybeTsconfigCustomConditions;
  } else {
    const { repo } = await getOwnerAndRepo({ dir: projectRoot });
    customConditions = [`@seek/${repo}/source`];
  }
  return customConditions;
};

const scaffoldVitestConfig = async () => {
  const jestConfigFiles = await fg(
    [
      '**/jest.config.{ts,js,mjs,mts,cts}',
      '**/jest.config.*.{ts,js,mjs,mts,cts}',
    ],
    {
      ignore: ['**/.git', '**/node_modules'],
    },
  );

  if (!jestConfigFiles.length) {
    return [];
  }

  const [jestConfigs, customConditions] = await Promise.all([
    readFiles(jestConfigFiles),
    determineCustomConditions(),
  ]);

  const viteConfigs = jestConfigs.map(({ file, content }) => {
    const ast = parse('TypeScript', content);
    const root = ast.root();

    const coverageThreshold = extractCoverageThreshold(root);
    const coverageIgnorePatterns = extractCoverageIgnorePaths(root);

    const vitestConfigContent = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ${JSON.stringify(customConditions)},
    },
  },
  test: {
    env: {
      ENVIRONMENT: 'test',
    },
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src'],
      exclude: ${coverageIgnorePatterns ?? "['src/testing']"},
      thresholds: ${
        coverageThreshold ??
        `{
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      }`
      },
    },
  },
});
`;

    return {
      content: vitestConfigContent,
      file: file.replace('jest.config', 'vitest.config'),
    };
  });

  const updatedJestConfigs = jestConfigs.map(({ file, content }) => {
    const comment =
      '// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.';
    const updatedContent = `${comment}\n\n${content}`;
    return {
      file,
      content: updatedContent,
    };
  });

  return [...updatedJestConfigs, ...viteConfigs];
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

  const configFilesToUpdate = await scaffoldVitestConfig();

  if (configFilesToUpdate.length && mode === 'lint') {
    return {
      result: 'apply',
    };
  }

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

  return {
    result: 'apply',
  };
};
