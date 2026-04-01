import path from 'path';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import ts from 'typescript';

/**
 * When the first import in a file is from 'vitest' and is immediately followed
 * by expression statements (e.g. vi.mock calls) or side-effectful imports
 * (e.g. import 'reflect-metadata'), move the vitest import to after that
 * consecutive block.
 *
 * Before:
 *   import { vi } from 'vitest';
 *   vi.mock('./a');
 *   import { foo } from './a';
 *
 * After:
 *   vi.mock('./a');
 *   import { vi } from 'vitest';
 *   import { foo } from './a';
 */
const collectViImportEdits = (root: SgNode, content: string): Edit[] => {
  // Only proceed if the very first program statement is an import from 'vitest'
  const firstChild = root.find({
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
    },
  });

  if (!firstChild) {
    return [];
  }

  const programChildren = root.children();

  const isSideEffectImport = (node: SgNode): boolean =>
    node.kind() === 'import_statement' &&
    !node.find({ rule: { kind: 'import_clause' } });

  // Collect the consecutive block of expression_statements or side-effectful
  // import_statements immediately after the vitest import
  const blockNodes: SgNode[] = [];
  let i = 1;
  while (i < programChildren.length) {
    const node = programChildren[i];
    if (!node) {
      break;
    }
    if (node.kind() === 'expression_statement' || isSideEffectImport(node)) {
      blockNodes.push(node);
      i++;
    } else {
      break;
    }
  }

  const lastBlockNode = blockNodes[blockNodes.length - 1];
  if (!lastBlockNode) {
    return [];
  }

  // Move the vitest import to just after the block
  const vitestStart = firstChild.range().start.index;
  const vitestEnd = firstChild.range().end.index;
  const vitestEndWithNL =
    content[vitestEnd] === '\n' ? vitestEnd + 1 : vitestEnd;

  const lastBlockEnd = lastBlockNode.range().end.index;
  const lastBlockEndWithNL =
    content[lastBlockEnd] === '\n' ? lastBlockEnd + 1 : lastBlockEnd;

  const vitestLine = content.slice(vitestStart, vitestEndWithNL);

  return [
    { insertedText: '', startPos: vitestStart, endPos: vitestEndWithNL },
    {
      insertedText: vitestLine,
      startPos: lastBlockEndWithNL,
      endPos: lastBlockEndWithNL,
    },
  ];
};

const compilerOptionsCache = new Map<string, ts.CompilerOptions>();

const getProgram = (filePath: string): ts.Program => {
  const dir = path.dirname(filePath);
  const cachedOptions = compilerOptionsCache.get(dir);
  let compilerOptions: ts.CompilerOptions;

  if (cachedOptions) {
    compilerOptions = cachedOptions;
  } else {
    const configFile = ts.findConfigFile(dir, (f) => ts.sys.fileExists(f));
    compilerOptions = { noEmit: true };
    if (configFile) {
      const readResult = ts.readConfigFile(configFile, (f) =>
        ts.sys.readFile(f),
      );
      const { options } = ts.parseJsonConfigFileContent(
        readResult.config as object,
        ts.sys,
        path.dirname(configFile),
      );
      compilerOptions = { ...options, noEmit: true };
    }
    compilerOptionsCache.set(dir, compilerOptions);
  }

  return ts.createProgram([filePath], compilerOptions);
};

export const applyJestFixes = async (
  filePath: string,
  content: string,
): Promise<string> => {
  const ast = await parseAsync('TypeScript', content);
  const root = ast.root();

  // Find lifecycle hooks with non-async arrow function callbacks
  // and collect unawaited call expressions within them
  const hookCalls = root.findAll({
    rule: {
      kind: 'call_expression',
      regex: '^(beforeEach|afterEach|beforeAll|afterAll)',
    },
  });

  type CallInfo = {
    callNode: SgNode;
    callbackNode: SgNode;
  };

  type FnRefInfo = {
    hookCall: SgNode;
    fnRefNode: SgNode;
  };

  const callsToCheck: CallInfo[] = [];
  const fnRefCallsToCheck: FnRefInfo[] = [];

  for (const hookCall of hookCalls) {
    const args = hookCall.children().find((c) => c.kind() === 'arguments');
    if (!args) {
      continue;
    }

    const callback = args.children().find((c) => c.kind() === 'arrow_function');
    if (callback) {
      if (callback.text().trimStart().startsWith('async ')) {
        continue;
      }

      const callbackStart = callback.range().start.index;
      const isDirectlyInCallback = (node: SgNode): boolean => {
        let current = node.parent();
        while (current) {
          if (current.range().start.index === callbackStart) {
            return true;
          }
          const kind = current.kind();
          if (
            kind === 'arrow_function' ||
            kind === 'function_expression' ||
            kind === 'function_declaration'
          ) {
            return false;
          }
          current = current.parent();
        }
        return false;
      };

      const innerCalls = callback.findAll({
        rule: { kind: 'call_expression' },
      });
      for (const call of innerCalls) {
        if (
          call.parent()?.kind() !== 'await_expression' &&
          isDirectlyInCallback(call)
        ) {
          callsToCheck.push({ callNode: call, callbackNode: callback });
        }
      }
    } else {
      // Handle plain identifier (function reference) as the callback argument
      const argNodes = args
        .children()
        .filter(
          (c) => c.kind() !== '(' && c.kind() !== ')' && c.kind() !== ',',
        );
      const [firstArg] = argNodes;
      if (
        argNodes.length === 1 &&
        (firstArg?.kind() === 'identifier' ||
          firstArg?.kind() === 'member_expression')
      ) {
        fnRefCallsToCheck.push({
          hookCall,
          fnRefNode: firstArg,
        });
      }
    }
  }

  const edits: Edit[] = [];

  if (callsToCheck.length || fnRefCallsToCheck.length) {
    // Use the TypeScript compiler API to determine if each call returns a Promise
    const program = getProgram(filePath);
    const checker = program.getTypeChecker();
    const tsSourceFile = program.getSourceFile(filePath);

    if (tsSourceFile) {
      const findCallExpressionAtPos = (
        pos: number,
      ): ts.CallExpression | undefined => {
        const find = (node: ts.Node): ts.CallExpression | undefined => {
          if (node.getStart() === pos && ts.isCallExpression(node)) {
            return node;
          }
          if (node.pos <= pos && pos < node.end) {
            return ts.forEachChild(node, find);
          }
          return undefined;
        };
        return find(tsSourceFile);
      };

      const isPromiseReturning = (callNode: SgNode): boolean => {
        const tsCall = findCallExpressionAtPos(callNode.range().start.index);
        if (!tsCall) {
          return false;
        }
        const type = checker.getTypeAtLocation(tsCall);
        return type.getSymbol()?.getName() === 'Promise';
      };

      const isFunctionRefReturningPromise = (fnRefNode: SgNode): boolean => {
        const pos = fnRefNode.range().start.index;
        const find = (node: ts.Node): ts.Node | undefined => {
          if (
            (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) &&
            node.getStart() === pos
          ) {
            return node;
          }
          if (node.pos <= pos && pos < node.end) {
            return ts.forEachChild(node, find);
          }
          return undefined;
        };
        const tsNode = find(tsSourceFile);
        if (!tsNode) {
          return false;
        }
        const type = checker.getTypeAtLocation(tsNode);
        for (const sig of type.getCallSignatures()) {
          const retType = checker.getReturnTypeOfSignature(sig);
          if (retType.getSymbol()?.getName() === 'Promise') {
            return true;
          }
        }
        return false;
      };

      const asyncCallInfos = callsToCheck.filter(({ callNode }) =>
        isPromiseReturning(callNode),
      );

      const processedCallbackPositions = new Set<number>();

      for (const { callbackNode, callNode } of asyncCallInfos) {
        const callbackPos = callbackNode.range().start.index;
        if (!processedCallbackPositions.has(callbackPos)) {
          edits.push({
            insertedText: 'async ',
            startPos: callbackPos,
            endPos: callbackPos,
          });
          processedCallbackPositions.add(callbackPos);
        }
        edits.push({
          insertedText: 'await ',
          startPos: callNode.range().start.index,
          endPos: callNode.range().start.index,
        });
      }

      for (const { hookCall, fnRefNode } of fnRefCallsToCheck) {
        const fnName = fnRefNode.text();
        const isAsync = isFunctionRefReturningPromise(fnRefNode);
        const col = hookCall.range().start.column;
        const baseIndent = ' '.repeat(col);
        const bodyIndent = `${baseIndent}  `;
        const insertedText = isAsync
          ? `async () => {\n${bodyIndent}await ${fnName}();\n${baseIndent}}`
          : `() => {\n${bodyIndent}${fnName}();\n${baseIndent}}`;
        edits.push({
          insertedText,
          startPos: fnRefNode.range().start.index,
          endPos: fnRefNode.range().end.index,
        });
      }
    }
  }

  edits.push(...collectViImportEdits(root, content));

  if (!edits.length) {
    return content;
  }

  return root.commitEdits(edits);
};
