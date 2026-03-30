import path from 'node:path';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import { getCustomConditions } from '../../build/tsc.js';
import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

import { migrateAsyncHooks } from './jestHooks.js';

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
  return [
    ...updatedPackageJsons,
    ...updatedPnpmWorkspaces,
    ...updatedBuildkiteFiles,
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

  const coverageObject = coverageThreshold
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'object');

  const globalObject = global
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'object');

  const globalPair = global?.parent();

  const coverageWithoutGlobal =
    globalPair && globalObject
      ? coverageObject?.commitEdits([
          {
            insertedText: globalObject.text().slice(1, -1), // remove the surrounding braces of the global object
            startPos: coverageObject.range().start.index + 1, // insert after the opening brace of the coverage object
            endPos: coverageObject.range().start.index + 1,
          },
          {
            insertedText: '',
            startPos: globalPair.range().start.index - 2, // include the colon and space before 'global'
            endPos: globalPair.range().end.index + 1, // include the comma after the global object
          },
        ])
      : coverageObject?.text();

  return coverageWithoutGlobal;
};

const extractRawStringArray = (
  node: SgNode,
  key: string,
): string | undefined => {
  const coveragePathIgnorePatterns = node.find({
    rule: {
      kind: 'property_identifier',
      regex: `^${key}$`,
    },
  });

  const arrayObject = coveragePathIgnorePatterns
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'array');

  return arrayObject?.text();
};

const removeProjectsFromConfig = async (
  node: SgNode,
  content: string,
): Promise<
  | {
      updatedContent: string;
      projectsNode: SgNode | undefined;
      updatedRoot: SgNode;
    }
  | undefined
> => {
  const projectsNode = node.find({
    rule: {
      kind: 'property_identifier',
      regex: '^projects$',
    },
  });

  const arrayNode = projectsNode
    ?.parent()
    ?.children()
    .find((c) => c.kind() === 'array');

  const pair = projectsNode?.parent();
  if (pair?.kind() === 'pair') {
    const maybeComma = content.slice(
      pair.range().end.index,
      pair.range().end.index + 1,
    );

    const updatedContent = node.commitEdits([
      {
        insertedText: '',
        startPos: pair.range().start.index,
        endPos: pair.range().end.index + (maybeComma === ',' ? 1 : 0), // include the comma if it's there
      },
    ]);
    const ast = await parseAsync('TypeScript', updatedContent);
    const root = ast.root();

    return {
      updatedContent,
      updatedRoot: root,
      projectsNode: arrayNode,
    };
  }

  return undefined;
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
    .find((c) => c.kind() === 'string');

  return stringNode?.text().replace(/^['"]|['"]$/g, ''); // remove surrounding quotes
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

  const ast = await parseAsync('TypeScript', jestGlobalSetup);
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
        file: absolutePath,
        content: `// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.\n\n${jestGlobalSetup}`,
      },
    ],
    globalSetupPath: normalizedPath.replace('jest', 'vitest'),
  };
};

const migrateEnvironmentSetup = async (file: string) => {
  const ast = await parseAsync('TypeScript', file);
  const root = ast.root();

  const envAssignments = root.findAll({
    rule: {
      kind: 'assignment_expression',
      regex: '^process.env.',
    },
  });

  const rootLevelEnvAssignments = envAssignments.filter((assignment) => {
    const parent = assignment.parent();
    return (
      parent?.kind() === 'expression_statement' &&
      parent.parent()?.kind() === 'program'
    );
  });

  const edits: Edit[] = rootLevelEnvAssignments.map((assignment) => {
    const nodeToDelete = assignment.parent() ?? assignment;
    const isNextCharacterNewline =
      file.slice(
        nodeToDelete.range().end.index,
        nodeToDelete.range().end.index + 1,
      ) === '\n';
    return {
      insertedText: '',
      startPos: nodeToDelete.range().start.index,
      endPos: nodeToDelete.range().end.index + (isNextCharacterNewline ? 1 : 0), // include the newline if present
    };
  });

  const updatedContent = root.commitEdits(edits);

  const envVars = rootLevelEnvAssignments
    .map((assignment) => {
      const envVarName = assignment
        .children()
        .find((c) => c.kind() === 'member_expression')
        ?.children()
        .find((c) => c.kind() === 'property_identifier')
        ?.text();

      const envVarValueNode = assignment.field('right')?.text();

      return envVarName && envVarValueNode
        ? ([envVarName, envVarValueNode] as const)
        : undefined;
    })
    .filter((name) => name !== undefined);

  return {
    updatedContent,
    envVars,
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

const extractProjects = async (
  node: SgNode,
  file: string,
  docRoot: SgNode,
): Promise<
  Array<{
    edits: FileContent[];
    testConfig: string;
  }>
> => {
  const objects = node.children().filter((c) => c.kind() === 'object');

  return await Promise.all(
    objects.map((o) =>
      scaffoldTestConfig({
        root: o,
        file,
        docRoot,
        isProject: true,
      }),
    ),
  );
};

const extractSpreadElements = async (
  node: SgNode,
  file: string,
  docRoot: SgNode,
): Promise<
  | Array<{
      edits: FileContent[];
      testConfig: string;
    }>
  | undefined
> => {
  const spreadElements = node.findAll({
    rule: {
      kind: 'spread_element',
    },
  });

  if (!spreadElements.length) {
    return undefined;
  }

  const configNodes = spreadElements
    .map((spread) => {
      const identifier = spread
        .children()
        .find((c) => c.kind() === 'identifier')
        ?.text();

      if (!identifier) {
        return undefined;
      }

      const variableDeclarator = docRoot.find({
        rule: {
          kind: 'variable_declarator',
          regex: `^${identifier}`,
        },
      });

      const objectNode = variableDeclarator
        ?.children()
        .find((c) => c.kind() === 'object');

      return objectNode;
    })
    .filter((configNode) => configNode !== undefined);

  if (!configNodes.length) {
    return undefined;
  }

  return Promise.all(
    configNodes.map((configNode) =>
      scaffoldTestConfig({
        root: configNode,
        file,
        docRoot,
        isSpread: true,
      }),
    ),
  );
};

const migrateSetupHooks = async (
  node: SgNode,
  jestConfigPath: string,
  key: string,
): Promise<
  | { edits: FileContent[]; hookPaths: string[]; envVars: Map<string, string> }
  | undefined
> => {
  const setupHookPaths = extractStringArray(node, key);

  if (!setupHookPaths || setupHookPaths.length === 0) {
    return undefined;
  }

  const normalizedPaths = setupHookPaths.map((p) =>
    p.replace('<rootDir>/', ''),
  );

  const envVars = new Map<string, string>();

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

      const { updatedContent, envVars: hookEnvVars } =
        await migrateEnvironmentSetup(jestSetupHook);

      hookEnvVars.forEach(([k, value]) => {
        envVars.set(k, value);
      });

      return [
        {
          file: absolutePath.replace('jest', 'vitest'),
          content: updatedContent,
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
    envVars,
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

const scaffoldTestConfig = async ({
  root,
  file,
  docRoot,
  projectsNode,
  isProject,
  isSpread,
}: {
  root: SgNode;
  file: string;
  docRoot: SgNode;
  projectsNode?: SgNode;
  isProject?: boolean;
  isSpread?: boolean;
}): Promise<{
  edits: FileContent[];
  testConfig: string;
}> => {
  const rootDir = extractString(root, 'rootDir') ?? '';
  const coverageThreshold = extractCoverageThreshold(root);
  const coverageIgnorePatterns = extractRawStringArray(
    root,
    'coveragePathIgnorePatterns',
  );
  const testPathIgnorePatterns = extractRawStringArray(
    root,
    'testPathIgnorePatterns',
  );
  const testMatch = extractStringArray(root, 'testMatch');
  const testRegexString = extractString(root, 'testRegex');
  const testRegexArray = extractStringArray(root, 'testRegex');
  const includeArray = [
    ...(testMatch ?? []),
    ...(testRegexArray ?? []),
    ...(testRegexString ? [testRegexString] : []),
  ];

  const displayName = extractString(root, 'displayName');

  const testTimeout = extractNumber(root, 'testTimeout');
  const restoreMocks = extractBoolean(root, 'restoreMocks');
  const clearMocks = extractBoolean(root, 'clearMocks');
  const resetMocks = extractBoolean(root, 'resetMocks');
  const maxWorkers =
    extractString(root, 'maxWorkers') ?? extractNumber(root, 'maxWorkers');
  const workerMemoryLimit =
    extractString(root, 'workerIdleMemoryLimit') ??
    extractNumber(root, 'workerIdleMemoryLimit');
  const maxConcurrency = extractNumber(root, 'maxConcurrency');

  const [
    globalSetup,
    setupFiles,
    setupFilesAfterEnv,
    projects,
    spreadElements,
  ] = await Promise.all([
    migrateGlobalSetup(root, file),
    migrateSetupHooks(root, file, 'setupFiles'),
    migrateSetupHooks(root, file, 'setupFilesAfterEnv'),
    projectsNode ? extractProjects(projectsNode, file, docRoot) : [],
    extractSpreadElements(root, file, docRoot),
  ]);

  const setupFilesCombined = [
    ...(setupFiles?.hookPaths ?? []),
    ...(setupFilesAfterEnv?.hookPaths ?? []),
  ];
  const baseEnvVars =
    !isProject && !isSpread
      ? new Map<string, string>([['ENVIRONMENT', "'test'"]])
      : new Map<string, string>();

  const envVarsCombined = new Map<string, string>([
    ...baseEnvVars,
    ...(setupFiles?.envVars ?? new Map()),
    ...(setupFilesAfterEnv?.envVars ?? new Map()),
  ]);

  return {
    testConfig: `${displayName ? `\n    name: '${displayName}',` : ''}${
      isProject ? '\n    extends: true,' : ''
    }${
      envVarsCombined.size
        ? `\n    env: {\n${[...envVarsCombined.entries()]
            .map(([key, value]) => `      ${key}: ${value},`)
            .join('\n')}\n    },`
        : ''
    }${
      (!isProject && !isSpread) || coverageIgnorePatterns || coverageThreshold
        ? `\n    coverage: {
      exclude: ${coverageIgnorePatterns ? `${coverageIgnorePatterns}, // TODO: Update these regexp pattern strings to globs` : "['src/testing'],"}
      thresholds: ${
        coverageThreshold ??
        `{
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      }`
      },
    },`
        : ''
    }${rootDir ? `\n    root: '${rootDir}',` : ''}${
      includeArray.length
        ? `\n    include: [${includeArray.map((pattern) => `'${pattern}'`).join(', ')}], // TODO: Update these regexp pattern strings to globs`
        : ''
    }${
      testPathIgnorePatterns
        ? `\n    exclude: ${testPathIgnorePatterns}, // TODO: Update these regexp pattern strings to globs`
        : ''
    }${
      globalSetup
        ? `\n    globalSetup: ['${globalSetup.globalSetupPath}'],`
        : ''
    }${
      setupFilesCombined.length
        ? `\n    setupFiles: [${setupFilesCombined.map((p) => `'${p}'`).join(', ')}],`
        : ''
    }${testTimeout ? `\n    testTimeout: ${testTimeout},` : ''}${
      restoreMocks ? '\n    restoreMocks: true,' : ''
    }${
      resetMocks ? '\n    mockReset: true,' : ''
    }${clearMocks ? '\n    clearMocks: true,' : ''}${
      workerMemoryLimit
        ? `\n    vmMemoryLimit: ${typeof workerMemoryLimit === 'string' ? `'${workerMemoryLimit}'` : workerMemoryLimit},`
        : ''
    }${maxWorkers ? `\n    maxWorkers: ${typeof maxWorkers === 'string' ? `'${maxWorkers}'` : maxWorkers},` : ''}${
      maxConcurrency ? `\n    maxConcurrency: ${maxConcurrency},` : ''
    }${
      projects.length
        ? `\n    projects: [\n      ${projects.map((p) => `{\n        test: {${p.testConfig}\n},\n      }`).join(',\n      ')}\n    ],`
        : ''
    }${spreadElements ? `\n    // TODO: A base config was detected and migrated below. This may have produced duplicate entries. \n    ${spreadElements.map((s) => s.testConfig).join(',\n    ')}` : ''}`, // this has caveats of potentially producing duplicates as handling spread logic is too complex to do perfectly
    edits: [
      ...(globalSetup?.edits ?? []),
      ...(setupFiles?.edits ?? []),
      ...(setupFilesAfterEnv?.edits ?? []),
      ...projects.flatMap((p) => p.edits),
      ...(spreadElements ? spreadElements.flatMap((s) => s.edits) : []),
    ],
  };
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
      const ast = await parseAsync('TypeScript', content);
      const root = ast.root();

      const isSkubaConfig = content.includes('Jest.mergePreset');

      const maybeProjectsData = await removeProjectsFromConfig(root, content);

      const rootWithoutProjects = maybeProjectsData
        ? maybeProjectsData.updatedRoot
        : root;

      const testConfig = await scaffoldTestConfig({
        root: rootWithoutProjects,
        file,
        docRoot: root,
        projectsNode: maybeProjectsData?.projectsNode,
      });

      const watchPathIgnorePatterns = extractRawStringArray(
        root,
        'watchPathIgnorePatterns',
      );

      const vitestConfigContent = `${isSkubaConfig ? "import { Vitest } from 'skuba';\n" : ''}import { defineConfig } from 'vitest/config';

export default defineConfig(${isSkubaConfig ? 'Vitest.mergePreset({' : '{'}
  ssr: {
    resolve: {
      conditions: [${customConditions.map((c) => `'${c}'`).join(', ')}],
    },
  },
  test: {${testConfig.testConfig}
  },${watchPathIgnorePatterns ? `\n  server: {\n    watch: {\n      ignored: ${watchPathIgnorePatterns}, // TODO: Update these regexp pattern strings to globs\n    },\n  },` : ''}
}${isSkubaConfig ? ')' : ''});
`;

      return [
        {
          content: vitestConfigContent,
          file: file.replace('jest.config', 'vitest.config'),
        },
        ...testConfig.edits,
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

  // The sku migration doesn't handle async hooks nicely so we have to go back and re-patch them
  const tsFilePaths = await fg(['**/*.ts', '**/*.tsx'], {
    ignore: ['**/.git', '**/node_modules'],
  });
  const tsFiles = await readFiles(tsFilePaths);

  await Promise.all(
    tsFiles.map(async ({ file, content }) => {
      const updated = await migrateAsyncHooks(file, content);
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

  if (packageManager.command === 'pnpm') {
    await exec('pnpm', 'install', '--no-frozen-lockfile', '--prefer-offline');
  } else {
    await exec('yarn', 'install', '--prefer-offline');
  }

  return {
    result: 'apply',
  };
};
