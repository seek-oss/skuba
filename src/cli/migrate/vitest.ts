import path from 'node:path';

import { type SgNode, parse } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../utils/exec.js';
import { log } from '../../utils/logging.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import { getCustomConditions } from '../build/tsc.js';
import type { PatchReturnType } from '../lint/internalLints/upgrade/index.js';

import { findRoot, getOwnerAndRepo } from '@skuba-lib/api/git';
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

const extractNumber = (node: SgNode, key: string): number | undefined => {
  const propertyNode = node.find({
    rule: {
      kind: 'property_identifier',
      regex: `^${key}$`,
    },
  });

  const numberNode = propertyNode
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'number');

  return numberNode ? Number(numberNode.text()) : undefined;
};

const extractBoolean = (node: SgNode, key: string): boolean | undefined => {
  const propertyNode = node.find({
    rule: {
      kind: 'property_identifier',
      regex: `^${key}$`,
    },
  });

  const booleanNode = propertyNode
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'true' || c.kind() === 'false');

  return booleanNode ? booleanNode.kind() === 'true' : undefined;
};

const extractString = (node: SgNode, key: string): string | undefined => {
  const propertyNode = node.find({
    rule: {
      kind: 'property_identifier',
      regex: `^${key}$`,
    },
  });

  const stringNode = propertyNode
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'string')
    ?.children()
    .find((c) => c.kind() === 'string_fragment');

  return stringNode?.text();
};

const migrateGlobalSetup = async (
  node: SgNode,
  jestConfigPath: string,
): Promise<{ edits: FileContent[]; globalSetupPath: string } | undefined> => {
  const globalSetupPath = extractString(node, 'globalSetup');
  if (!globalSetupPath) {
    return undefined;
  }

  const normalizedPath = globalSetupPath.replace('<rootDir>/', '');
  const filePath = path.dirname(jestConfigPath);
  const absolutePath = path.join(filePath, normalizedPath);

  let jestGlobalSetup: string;
  try {
    jestGlobalSetup = await fs.promises.readFile(absolutePath, 'utf8');
  } catch {
    log.warn(
      `Could not read global setup file at ${absolutePath}. Skipping migration of global setup.`,
    );
    return undefined;
  }

  const ast = parse('TypeScript', jestGlobalSetup);
  const root = ast.root();

  const moduleExports = root.find({
    rule: {
      kind: 'expression_statement',
      regex: '^module.exports',
    },
  });

  const moduleExportsNode = moduleExports
    ?.children()
    .find((c) => c.kind() === 'assignment_expression')
    ?.children()
    .find((c) => c.kind() === 'member_expression');
  if (!moduleExportsNode) {
    return undefined;
  }

  const vitestGlobal = moduleExportsNode.replace('export const setup');

  const vitestGlobalSetup = root.commitEdits([vitestGlobal]);

  return {
    edits: [
      {
        file: absolutePath.replace('jest', 'vitest'),
        content: vitestGlobalSetup,
      },
      {
        file: jestConfigPath,
        content: `// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.\n\n${jestGlobalSetup}`,
      },
    ],
    globalSetupPath: normalizedPath.replace('jest', 'vitest'),
  };
};

const extractStringArray = (
  node: SgNode,
  key: string,
): string[] | undefined => {
  const propertyNode = node.find({
    rule: {
      kind: 'property_identifier',
      regex: `^${key}$`,
    },
  });

  const arrayNode = propertyNode
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'array');

  const stringNodes = arrayNode
    ?.children()
    .filter((c) => c.kind() === 'string')
    ?.map((c) =>
      c
        .children()
        .find((child) => child.kind() === 'string_fragment')
        ?.text(),
    )
    ?.filter((text) => text !== undefined);

  return stringNodes;
};

const migrateSetupHooks = async (
  node: SgNode,
  jestConfigPath: string,
  key: string,
): Promise<{ edits: FileContent[]; hookPaths: string[] } | undefined> => {
  const setupHookPaths = extractStringArray(node, key);

  if (!setupHookPaths || setupHookPaths.length === 0) {
    return undefined;
  }

  const normalizedPaths = setupHookPaths.map((p) =>
    p.replace('<rootDir>/', ''),
  );

  const edits = await Promise.all(
    normalizedPaths.map(async (normalizedPath) => {
      const filePath = path.dirname(jestConfigPath);
      const absolutePath = path.join(filePath, normalizedPath);

      let jestSetupHook: string;
      try {
        jestSetupHook = await fs.promises.readFile(absolutePath, 'utf8');
      } catch {
        log.warn(
          `Could not read setup hook file at ${absolutePath}. Skipping migration of this setup hook.`,
        );
        return [];
      }

      return [
        {
          file: absolutePath.replace('jest', 'vitest'),
          content: jestSetupHook,
        },
        {
          file: absolutePath,
          content: `// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.\n\n${jestSetupHook}`,
        },
      ];
    }),
  );

  return {
    edits: edits.flat(),
    hookPaths: normalizedPaths.map((p) => p.replace('jest', 'vitest')),
  };
};

const determineCustomConditions = async (): Promise<string[]> => {
  const gitRoot = await findRoot({ dir: process.cwd() });
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

  const viteConfigEdits = await Promise.all(
    jestConfigs.map(async ({ file, content }) => {
      const ast = parse('TypeScript', content);
      const root = ast.root();

      const isSkubaConfig = content.includes('Jest.mergePreset');

      const coverageThreshold = extractCoverageThreshold(root);
      const coverageIgnorePatterns = extractCoverageIgnorePaths(root);
      const testTimeout = extractNumber(root, 'testTimeout');
      const clearMocks = extractBoolean(root, 'clearMocks');
      const workerMemoryLimit =
        extractString(root, 'workerIdleMemoryLimit') ??
        extractNumber(root, 'workerIdleMemoryLimit');

      const [globalSetup, setupFiles, setupFilesAfterEnv] = await Promise.all([
        migrateGlobalSetup(root, file),
        migrateSetupHooks(root, file, 'setupFiles'),
        migrateSetupHooks(root, file, 'setupFilesAfterEnv'),
      ]);

      const vitestConfigContent = `${isSkubaConfig ? "import { Vitest } from 'skuba';\n" : ''}import { defineConfig } from 'vitest/config';

export default defineConfig(${isSkubaConfig ? 'Vitest.mergePreset({' : '{'}
  ssr: {
    resolve: {
      conditions: [${customConditions.map((c) => `'${c}'`).join(', ')}],
    },
  },
  test: {
    env: {
      ENVIRONMENT: 'test',
    },
    include: ['src/**/*.test.ts'],
    coverage: {
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
    }${
      globalSetup
        ? `,\n    globalSetup: ['${globalSetup.globalSetupPath}']`
        : ''
    }${
      setupFiles
        ? `,\n    setupFiles: [${setupFiles.hookPaths.map((p) => `'${p}'`).join(', ')}]`
        : ''
    }${
      setupFilesAfterEnv
        ? `,\n    setupFilesAfterEnv: [${setupFilesAfterEnv.hookPaths.map((p) => `'${p}'`).join(', ')}]`
        : ''
    }${testTimeout ? `,\n    testTimeout: ${testTimeout}` : ''}${
      clearMocks ? ',\n    clearMocks: true' : ''
    }${
      workerMemoryLimit
        ? `,\n    vmMemoryLimit: ${typeof workerMemoryLimit === 'string' ? `'${workerMemoryLimit}'` : workerMemoryLimit}`
        : ''
    }
  },
}${isSkubaConfig ? ')' : ''});
`;

      return [
        {
          content: vitestConfigContent,
          file: file.replace('jest.config', 'vitest.config'),
        },
        ...(globalSetup?.edits ?? []),
        ...(setupFiles?.edits ?? []),
        ...(setupFilesAfterEnv?.edits ?? []),
      ];
    }),
  );

  const updatedJestConfigs = jestConfigs.map(({ file, content }) => {
    const comment =
      '// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.';
    const updatedContent = `${comment}\n\n${content}`;
    return {
      file,
      content: updatedContent,
    };
  });

  const allEdits = [...updatedJestConfigs, ...viteConfigEdits.flat()];
  // Remove duplicates as some Jest configs may have both setupFiles and setupFilesAfterEnv which could result in duplicate writes
  return [...new Map(allEdits.map((item) => [item.file, item])).values()];
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

  if (process.env.DANGEROUSLY_MIGRATE_TO_VITEST !== 'true') {
    const vitestConfigFiles = await fg(
      ['**/vitest.config.{ts,js,mjs,mts,cts}'],
      {
        ignore: ['**/.git', '**/node_modules'],
      },
    );

    if (vitestConfigFiles.length > 0) {
      return {
        result: 'skip',
        reason: 'vitest is already configured in this project',
      };
    }
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
