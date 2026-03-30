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

  const callsToCheck: CallInfo[] = [];

  for (const hookCall of hookCalls) {
    const args = hookCall.children().find((c) => c.kind() === 'arguments');
    if (!args) {
      continue;
    }

    const callback = args.children().find((c) => c.kind() === 'arrow_function');
    if (!callback || callback.text().trimStart().startsWith('async ')) {
      continue;
    }

    const innerCalls = callback.findAll({ rule: { kind: 'call_expression' } });
    for (const call of innerCalls) {
      if (call.parent()?.kind() !== 'await_expression') {
        callsToCheck.push({ callNode: call, callbackNode: callback });
      }
    }
  }

  if (!callsToCheck.length) {
    return content;
  }

  // Use the TypeScript compiler API to determine if each call returns a Promise
  const program = ts.createProgram([filePath], { noEmit: true });
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

  const asyncCallInfos = callsToCheck.filter(({ callNode }) =>
    isPromiseReturning(callNode),
  );

  if (!asyncCallInfos.length) {
    return content;
  }

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

  return root.commitEdits(edits);
};
