import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';
import ts from 'typescript';

import { log } from '../../../../utils/logging.js';
import { readTsConfig } from '../../../build/tsc.js';

import type { FileContent } from './vitest.js';

export const getLifeCycleHooks = (root: SgNode) =>
  root.findAll({
    rule: {
      kind: 'call_expression',
      regex: '.*\(.*\)',
      not: { regex: '^(await|vi)' },
      inside: {
        kind: 'expression_statement',
        all: [
          // only match if there is a single statement
          {
            nthChild: {
              reverse: true,
              position: 1,
            },
          },
          {
            nthChild: 1,
          },
        ],
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

// The sku codemod does a naive transformation of the hooks eg. beforeEach(resetDynamoDB) becomes beforeEach(() => { resetDynamoDB() })
// It doesn't check if the function was returning a promise so we are checking if the function being called is a promise
// and adding async/await to the arrow function and the call expression if it is
// eg. beforeEach(() => { resetDynamoDB() }) becomes beforeEach(async () => { await resetDynamoDB() })
const getLifeCycleEdits = (
  root: SgNode,
  file: string,
  checker: ts.TypeChecker,
  program: ts.Program,
): Edit[] => {
  const lastStatementsInLifeCycleHooks = getLifeCycleHooks(root);

  if (!lastStatementsInLifeCycleHooks.length) {
    return [];
  }

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

export const editLifeCycleHooks = async (files: FileContent[]) => {
  const tsConfig = readTsConfig({
    dir: process.cwd(),
    fileName: 'tsconfig.json',
    log,
    silentlyFail: true,
  })?.options ?? {
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    strict: false,
    noEmit: true,
  };

  const program = ts.createProgram(
    files.map(({ file }) => file),
    tsConfig,
  );
  const checker = program.getTypeChecker();

  return Promise.all(
    files.map(async ({ file, content }) => {
      const root = (await parseAsync('TypeScript', content)).root();
      const edits = getLifeCycleEdits(root, file, checker, program);

      if (!edits.length) {
        return;
      }
      await fs.promises.writeFile(file, root.commitEdits(edits));
    }),
  );
};
