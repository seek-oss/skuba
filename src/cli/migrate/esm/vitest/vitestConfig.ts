import path from 'path';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../utils/logging.js';
import { getCustomConditions } from '../../../build/tsc.js';

import { type FileContent, readFiles } from './vitest.js';

import { findRoot, getOwnerAndRepo } from '@skuba-lib/api/git';

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
  rootDir: string = '',
): Promise<{ edits: FileContent[]; globalSetupPath: string } | undefined> => {
  const globalSetupPath = extractString(node, 'globalSetup');
  if (!globalSetupPath) {
    return undefined;
  }

  const normalizedPath = globalSetupPath.replace('<rootDir>/', '');
  const filePath = path.dirname(jestConfigPath);
  const absolutePath = path.resolve(filePath, rootDir, normalizedPath);

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

  const moduleExportsMember = root.find({
    rule: {
      kind: 'member_expression',
      regex: '^module.exports',
    },
  });

  if (!moduleExportsMember) {
    return undefined;
  }

  const edits: Edit[] = [moduleExportsMember.replace('export const setup')];

  const arrowFunction = root.find({
    rule: {
      kind: 'arrow_function',
      inside: {
        kind: 'assignment_expression',
        inside: {
          kind: 'expression_statement',
          regex: '^module.exports',
        },
      },
    },
  });

  if (arrowFunction) {
    const body = arrowFunction.field('body');
    const arrowFunctionText = arrowFunction.text();
    const bodyText = body?.text();
    const arrowIsAsync = arrowFunctionText.startsWith('async');

    const isAsync = arrowIsAsync || bodyText?.includes('Promise');

    if (!body) {
      return undefined;
    }

    if (body.kind() === 'call_expression') {
      // convert to block body with return statement;
      edits.push(body.replace(`{\n ${isAsync ? 'await' : ''} ${bodyText} }`));

      if (isAsync && !arrowIsAsync) {
        edits.push({
          insertedText: 'async ',
          startPos: arrowFunction.range().start.index,
          endPos: arrowFunction.range().start.index,
        });
      }
    }
  }

  const vitestGlobalSetup = root.commitEdits(edits);

  return {
    edits: [
      {
        file: absolutePath.replaceAll('jest', 'vitest'),
        content: vitestGlobalSetup,
      },
      {
        file: absolutePath,
        content: `// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.\n\n${jestGlobalSetup}`,
      },
    ],
    globalSetupPath: normalizedPath.replaceAll('jest', 'vitest'),
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

  const astAfterEdit = (await parseAsync('TypeScript', updatedContent)).root();

  const children = astAfterEdit
    .children()
    .filter((c) => c.kind() !== 'comment');

  const hasEmptyExportStatement = astAfterEdit.find({
    rule: {
      kind: 'export_statement',
      not: {
        has: {
          kind: 'export_clause',
          has: {
            kind: 'export_specifier',
          },
        },
      },
    },
  });

  const finalContent =
    hasEmptyExportStatement && children.length === 1 ? '' : updatedContent;

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
    updatedContent: finalContent,
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
  rootDir: string = '',
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
  const doNotMigrate = new Set<string>();

  const edits = await Promise.all(
    normalizedPaths.map(async (normalizedPath) => {
      const filePath = path.dirname(jestConfigPath);
      const absolutePath = path.resolve(filePath, rootDir, normalizedPath);

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

      const migratedJestConfig: FileContent = {
        file: absolutePath,
        content: `// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.\n\n${jestSetupHook}`,
      };

      if (!updatedContent) {
        doNotMigrate.add(normalizedPath);
        return [migratedJestConfig];
      }

      return [
        {
          file: absolutePath.replaceAll('jest', 'vitest'),
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
    hookPaths: normalizedPaths
      .filter((p) => !doNotMigrate.has(p))
      .map((p) => p.replaceAll('jest', 'vitest')),
    envVars,
  };
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
  const snapshotSerializers = extractStringArray(root, 'snapshotSerializers');
  const displayName = extractString(root, 'displayName');
  const coverageProvider = extractString(root, 'coverageProvider');
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
    migrateGlobalSetup(root, file, rootDir),
    migrateSetupHooks(root, file, rootDir, 'setupFiles'),
    migrateSetupHooks(root, file, rootDir, 'setupFilesAfterEnv'),
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
      provider: ${coverageProvider === 'v8' ? "'v8'" : "'istanbul'"},
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
    }${rootDir ? `\n    root: '${rootDir}',${rootDir.includes('..') ? ' // TODO: Vitest root paths work differently to Jest, you may need to remove or adjust this in order for your tests to run' : ''}` : ''}${
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
      snapshotSerializers?.length
        ? `\n    snapshotSerializers: [${snapshotSerializers.map((s) => `'${s.replace('<rootDir>/', '')}'`).join(', ')}],`
        : ''
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

export const scaffoldVitestConfig = async () => {
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
          file: file.replaceAll('jest', 'vitest'),
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
