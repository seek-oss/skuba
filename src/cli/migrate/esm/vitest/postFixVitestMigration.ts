import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import ts from 'typescript';

const getTsConfig = () => {
  const configFilePath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists.bind(undefined),
    'tsconfig.json',
  );

  if (!configFilePath) {
    return undefined;
  }

  const readResult = ts.readConfigFile(configFilePath, (f) =>
    ts.sys.readFile(f),
  );

  if (readResult.error) {
    return undefined;
  }

  return ts.parseJsonConfigFileContent(readResult.config, ts.sys, process.cwd())
    .options;
};

const getTsCallExpressionsByPos = (sourceFile: ts.SourceFile) => {
  const tsCallExpressionsByPos = new Map<number, ts.CallExpression>();

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      tsCallExpressionsByPos.set(node.getStart(), node);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return tsCallExpressionsByPos;
};

let tsConfigCache: ts.CompilerOptions | undefined;

// The sku vitest codemod misses a few cases
// eg. beforeEach(() => jest.clearAllMocks())
// but Vitest has unique behaviour when you return a function from a lifecycle hook
// so we instead edit it to be beforeEach(() => { jest.clearAllMocks() })
const getImmediateReturnEdits = (root: SgNode): Edit[] => {
  const immediateReturnsInLifeCycleHooks = root.findAll({
    rule: {
      kind: 'call_expression',
      inside: {
        kind: 'arrow_function',
        not: { regex: '^async' },
        inside: {
          kind: 'arguments',
          inside: {
            kind: 'call_expression',
            regex: '^(beforeEach|afterEach|afterAll|beforeAll)',
          },
        },
      },
    },
  });

  if (!immediateReturnsInLifeCycleHooks.length) {
    return [];
  }

  return immediateReturnsInLifeCycleHooks.map((callExpression) => {
    const existingText = callExpression.text();
    return callExpression.replace(`{ ${existingText} }`);
  });
};

// The sku vitest codemod transforms most lifecycle hooks but misses any where there is an overlap of edits
// eg. beforeEach(jest.clearAllMocks) becomes beforeEach(vi.clearAllMocks)
// so we need to transform it to be beforeEach(() => { vi.clearAllMocks() })
const getUnfixedLifeCycleEdits = (root: SgNode): Edit[] => {
  const viLifeCycleHooks = root.findAll({
    rule: {
      kind: 'member_expression',
      regex: '^vi\.',
      inside: {
        kind: 'arguments',
        inside: {
          kind: 'call_expression',
          regex: '^(beforeEach|afterEach|afterAll|beforeAll)',
        },
      },
    },
  });

  if (!viLifeCycleHooks.length) {
    return [];
  }

  return viLifeCycleHooks.map((hook) => {
    const existingText = hook.text();
    return hook.replace(`() => { ${existingText}() }`);
  });
};

// The sku codemod does a naive transformation of the hooks eg. beforeEach(resetDynamoDB) becomes beforeEach(() => { resetDynamoDB() })
// It doesn't check if the function was returning a promise so we are checking if the function being called is a promise
// and adding async/await to the arrow function and the call expression if it is
// eg. beforeEach(() => { resetDynamoDB() }) becomes beforeEach(async () => { await resetDynamoDB() })
const getLifeCycleEdits = (root: SgNode, file: string): Edit[] => {
  const lastStatementsInLifeCycleHooks = root.findAll({
    rule: {
      kind: 'call_expression',
      regex: '.*\(\)$',
      not: { regex: '^(await|vi)' },
      inside: {
        kind: 'expression_statement',
        nthChild: {
          reverse: true,
          position: 1,
        },
        inside: {
          kind: 'statement_block',
          inside: {
            kind: 'arrow_function',
            not: { regex: '^async' },
            inside: {
              kind: 'arguments',
              inside: {
                kind: 'call_expression',
                regex: '^(beforeEach|afterEach|afterAll|beforeAll)',
              },
            },
          },
        },
      },
    },
  });

  if (!lastStatementsInLifeCycleHooks.length) {
    return [];
  }

  tsConfigCache ??= getTsConfig() ?? {
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    strict: false,
    noEmit: true,
  };

  const program = ts.createProgram([file], tsConfigCache);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(file);

  if (!sourceFile) {
    return [];
  }

  const tsCallExpressionsByPos = getTsCallExpressionsByPos(sourceFile);

  const edits: Edit[][] = lastStatementsInLifeCycleHooks.map((statement) => {
    const pos = statement.range().start.index;
    const tsNode = tsCallExpressionsByPos.get(pos);
    if (!tsNode) {
      return [];
    }

    const type = checker.getTypeAtLocation(tsNode);
    const typeString = checker.typeToString(type);

    if (!typeString.startsWith('Promise<')) {
      return [];
    }

    const awaitEdit = statement.replace(`await ${statement.text()}`);
    const arrowFunction = statement.parent()?.parent()?.parent();
    if (arrowFunction?.kind() !== 'arrow_function') {
      return [];
    }

    return [
      awaitEdit,
      {
        startPos: arrowFunction.range().start.index,
        endPos: arrowFunction.range().start.index,
        insertedText: 'async ',
      },
    ];
  });

  return edits.flat();
};

// The sku vitest codemod naively inserts the vitest import at the top of the file
// which conflicts with eslint rules that require imports to be ordered a certain way
// so we need to shift the vitest import downwards if there are any imports directly below
// which are either side-effects or vi.mocks
// eg.
// import { vi } from 'vitest';
// import ./sideEffectImport;
// becomes
// import ./sideEffectImport;
// import { vi } from 'vitest';
const getImportOrderEdits = (root: SgNode): Edit[] => {
  const vitestImportInvalid = root.find({
    rule: {
      nthChild: 1,
      kind: 'import_statement',
      has: {
        kind: 'string',
        has: {
          kind: 'string_fragment',
          regex: '^vitest$',
        },
      },
      any: [
        {
          precedes: {
            kind: 'import_statement',
            has: {
              nthChild: 1,
              kind: 'string',
            },
          },
        },
        {
          precedes: {
            kind: 'expression_statement',
          },
        },
      ],
    },
  });

  if (!vitestImportInvalid) {
    return [];
  }

  const firstValidImport = root.find({
    rule: {
      kind: 'import_statement',
      not: {
        any: [
          {
            has: {
              kind: 'string',
              has: {
                kind: 'string_fragment',
                regex: '^vitest$',
              },
            },
          },
          {
            kind: 'import_statement',
            has: {
              nthChild: 1,
              kind: 'string',
            },
          },
        ],
      },
    },
  });

  if (!firstValidImport) {
    return [];
  }

  return [
    {
      startPos: vitestImportInvalid.range().start.index,
      endPos: vitestImportInvalid.range().end.index + 1, // newline
      insertedText: '',
    },
    firstValidImport.replace(
      `${vitestImportInvalid.text()}\n${firstValidImport.text()}`,
    ),
  ];
};

// Any vi.mock that is not on the root level emits a warning in vitest and needs to be transformed to `doMock`
// to not be hoisted or throw an error in future versions of Vitest.
const getBadMocksEdits = (root: SgNode): Edit[] => {
  const badMocks = root.findAll({
    rule: {
      kind: 'member_expression',
      regex: '^vi\.mock',
      not: {
        inside: {
          kind: 'call_expression',
          inside: {
            kind: 'expression_statement',
            inside: {
              kind: 'program',
            },
          },
        },
      },
    },
  });

  if (!badMocks.length) {
    return [];
  }

  return badMocks.map((mock) => mock.replace('vi.doMock'));
};

/**
 * Runs extra transformations after the sku vitest codemod to fix any missed cases
 */
export const postFixVitestMigration = async (file: string, content: string) => {
  if (!file.includes('test')) {
    return content;
  }

  const astRoot = (await parseAsync('TypeScript', content)).root();

  const edits = [
    ...getLifeCycleEdits(astRoot, file),
    ...getImmediateReturnEdits(astRoot),
    ...getUnfixedLifeCycleEdits(astRoot),
    ...getImportOrderEdits(astRoot),
    ...getBadMocksEdits(astRoot),
  ];

  if (!edits.length) {
    return content;
  }

  return astRoot.commitEdits(edits);
};
