import path from 'path';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import ts from 'typescript';

export const migrateAsyncHooks = async (
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

  type IdentifierInfo = {
    hookCall: SgNode;
    identifierNode: SgNode;
  };

  const callsToCheck: CallInfo[] = [];
  const identifierCallsToCheck: IdentifierInfo[] = [];

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
      if (argNodes.length === 1 && firstArg?.kind() === 'identifier') {
        identifierCallsToCheck.push({
          hookCall,
          identifierNode: firstArg,
        });
      }
    }
  }

  if (!callsToCheck.length && !identifierCallsToCheck.length) {
    return content;
  }

  // Use the TypeScript compiler API to determine if each call returns a Promise
  const configFile = ts.findConfigFile(path.dirname(filePath), (f) =>
    ts.sys.fileExists(f),
  );

  let compilerOptions: ts.CompilerOptions = { noEmit: true };
  if (configFile) {
    const readResult = ts.readConfigFile(configFile, (f) => ts.sys.readFile(f));
    const { options } = ts.parseJsonConfigFileContent(
      readResult.config as object,
      ts.sys,
      path.dirname(configFile),
    );
    compilerOptions = { ...options, noEmit: true };
  }

  const program = ts.createProgram([filePath], compilerOptions);
  const checker = program.getTypeChecker();
  const tsSourceFile = program.getSourceFile(filePath);

  if (!tsSourceFile) {
    return content;
  }

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

  const isFunctionIdentifierReturningPromise = (identNode: SgNode): boolean => {
    const pos = identNode.range().start.index;
    const find = (node: ts.Node): ts.Node | undefined => {
      if (ts.isIdentifier(node) && node.getStart() === pos) {
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

  const edits: Edit[] = [];
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

  for (const { hookCall, identifierNode } of identifierCallsToCheck) {
    const fnName = identifierNode.text();
    const isAsync = isFunctionIdentifierReturningPromise(identifierNode);
    const col = hookCall.range().start.column;
    const baseIndent = ' '.repeat(col);
    const bodyIndent = `${baseIndent}  `;
    const insertedText = isAsync
      ? `async () => {\n${bodyIndent}await ${fnName}();\n${baseIndent}}`
      : `() => {\n${bodyIndent}${fnName}();\n${baseIndent}}`;
    edits.push({
      insertedText,
      startPos: identifierNode.range().start.index,
      endPos: identifierNode.range().end.index,
    });
  }

  if (!edits.length) {
    return content;
  }

  return root.commitEdits(edits);
};
