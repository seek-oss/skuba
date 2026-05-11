import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';

import { getLifeCycleHooks } from './lifeCycleEdits.js';

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
            stopBy: 'end',
          },
        },
        {
          precedes: {
            kind: 'expression_statement',
          },
        },
        {
          precedes: {
            kind: 'comment',
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
          {
            precedes: {
              kind: 'import_statement',
              has: { nthChild: 1, kind: 'string' },
              stopBy: 'end',
            },
          },
          {
            follows: {
              kind: 'comment',
              regex: '^// eslint-disable-next-line',
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
      kind: 'expression_statement',
      regex: '^vi\.mock\\(',
      not: {
        inside: {
          kind: 'program',
        },
      },
    },
  });

  if (!badMocks.length) {
    return [];
  }

  return badMocks.map((mock) => ({
    startPos: mock.range().start.index + 'vi.'.length,
    endPos: mock.range().start.index + 'vi.mock'.length,
    insertedText: 'doMock',
  }));
};

// Updates importActual to include types
const getImportActualEdits = (root: SgNode): Edit[] => {
  const importActuals = root.findAll({
    rule: {
      kind: 'call_expression',
      regex: '^vi\.importActual\\(',
    },
  });

  if (!importActuals.length) {
    return [];
  }

  return importActuals
    .map((importActual) => {
      const packageName = importActual.find({
        rule: {
          kind: 'string',
        },
      });

      if (!packageName) {
        return [];
      }

      return importActual.replace(
        importActual
          .text()
          .replace(
            'vi.importActual',
            `(vi.importActual<typeof import(${packageName.text()})>`,
          )
          .concat(')'),
      );
    })
    .flat();
};

const getJestTypeEdits = (
  root: SgNode,
): { imports: Set<string>; edits: Edit[] } => {
  const jestTypes = root.findAll({
    rule: {
      kind: 'nested_type_identifier',
      regex:
        '^jest\.(Mock|MockedFunction|MockedClass|MockedObject|MockInstance|Mocked)$',
    },
  });

  if (!jestTypes.length) {
    return { imports: new Set(), edits: [] };
  }

  const imports = new Set<string>();
  const edits = jestTypes.map((jestType) => {
    const typeText = jestType.text();
    const typeWithoutJest = typeText.replace('jest.', '');
    imports.add(typeWithoutJest);
    return jestType.replace(typeWithoutJest);
  });

  return { imports, edits };
};

const getSpiedFunctionEdits = (root: SgNode): Edit[] => {
  const spyInstances = root.findAll({
    rule: {
      kind: 'nested_type_identifier',
      regex: '^jest\.SpiedFunction$',
    },
  });

  if (!spyInstances.length) {
    return [];
  }

  return spyInstances.map((spyInstance) => spyInstance.replace('Mock'));
};

const getSpyInstanceTypeEdits = (root: SgNode): Edit[] => {
  const spyInstances = root.findAll({
    rule: {
      kind: 'nested_type_identifier',
      regex: '^jest\.SpyInstance$',
    },
  });

  if (!spyInstances.length) {
    return [];
  }

  return spyInstances.map((spyInstance) => spyInstance.replace('MockInstance'));
};

const getTypeImportEdits = (root: SgNode, imports: string[]): Edit[] => {
  if (!imports.length) {
    return [];
  }

  const lastImport = root.find({
    rule: {
      kind: 'import_statement',
      inside: {
        kind: 'program',
      },
      nthChild: {
        ofRule: {
          kind: 'import_statement',
        },
        position: 1,
        reverse: true,
      },
    },
  });

  if (!lastImport) {
    return [];
  }

  return [
    {
      startPos: lastImport.range().end.index + 1, // newline
      endPos: lastImport.range().end.index + 1,
      insertedText: `import type { ${imports.join(', ')} } from 'vitest';\n`,
    },
  ];
};

export const getViMockedPrototypeEdits = (root: SgNode): Edit[] => {
  const mockedPrototypes = root.findAll({
    rule: {
      kind: 'arguments',
      inside: {
        kind: 'call_expression',
        inside: {
          kind: 'member_expression',
          pattern: 'vi.mocked($ARG).prototype',
        },
      },
    },
  });

  if (!mockedPrototypes.length) {
    return [];
  }

  return mockedPrototypes.map((mockedPrototype) => {
    const text = mockedPrototype.text();
    const hasExistingComma = /\(\s*[^,)]+\s*(,)\s*\)/.exec(text);
    const pos = mockedPrototype.range().end.index - 1; // before the closing bracket;
    return {
      startPos: pos,
      endPos: pos,
      insertedText: hasExistingComma ? 'true' : ',true',
    };
  });
};

const getBadMockImplementationEdits = (root: SgNode): Edit[] => {
  const badMockImplementations = root.findAll({
    rule: {
      kind: 'call_expression',
      regex: 'mockImplementation\\(\\)$',
      inside: {
        kind: 'member_expression',
        has: {
          kind: 'property_identifier',
          regex: '^mock(Return|Resolved|Rejected)',
        },
      },
    },
  });

  if (!badMockImplementations.length) {
    return [];
  }

  return badMockImplementations.map((mockImplementation) => {
    const text = mockImplementation.text();
    const replaceText = text.replace(/\s*\.mockImplementation\(\)$/, '');
    const charsToRemove = text.length - replaceText.length;

    return {
      startPos: mockImplementation.range().end.index - charsToRemove,
      endPos: mockImplementation.range().end.index,
      insertedText: '',
    };
  });
};

/**
 * Runs extra transformations after the sku vitest codemod to fix any missed cases
 */
export const postFixVitestMigration = async (file: string, content: string) => {
  if (!file.includes('test')) {
    return {
      updated: content,
      hasLifeCyclesToCheck: false,
    };
  }

  const astRoot = (await parseAsync('TypeScript', content)).root();

  const hasLifeCyclesToCheck = getLifeCycleHooks(astRoot).length > 0;

  const { imports: jestTypeImports, edits: jestTypeEdits } =
    getJestTypeEdits(astRoot);

  const spyInstanceTypeEdits = getSpyInstanceTypeEdits(astRoot);
  const spiedFunctionEdits = getSpiedFunctionEdits(astRoot);

  if (spyInstanceTypeEdits.length) {
    jestTypeImports.add('MockInstance');
  }

  if (spiedFunctionEdits.length) {
    jestTypeImports.add('Mock');
  }

  const edits = [
    ...getImmediateReturnEdits(astRoot),
    ...getUnfixedLifeCycleEdits(astRoot),
    ...getImportOrderEdits(astRoot),
    ...getBadMocksEdits(astRoot),
    ...getImportActualEdits(astRoot),
    ...jestTypeEdits,
    ...spyInstanceTypeEdits,
    ...spiedFunctionEdits,
    ...getTypeImportEdits(astRoot, Array.from(jestTypeImports)),
    ...getViMockedPrototypeEdits(astRoot),
    ...getBadMockImplementationEdits(astRoot),
  ];

  if (!edits.length) {
    return {
      updated: content,
      hasLifeCyclesToCheck,
    };
  }

  return {
    updated: astRoot.commitEdits(edits),
    hasLifeCyclesToCheck,
  };
};
