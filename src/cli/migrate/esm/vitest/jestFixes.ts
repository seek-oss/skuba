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

const compilerOptionsCache = new Map<
  string,
  { options: ts.CompilerOptions; rootNames: string[] }
>();
const programCache = new Map<string, ts.Program>();
const promiseCheckCache = new Map<string, boolean>();

const getProgram = (filePath: string): ts.Program => {
  const dir = path.dirname(filePath);

  // If the cached program already includes this file, reuse it directly.
  const cachedProgram = programCache.get(dir);
  if (cachedProgram?.getSourceFile(filePath)) {
    return cachedProgram;
  }

  const cachedEntry = compilerOptionsCache.get(dir);
  let compilerOptions: ts.CompilerOptions;
  let rootNames: string[];

  if (cachedEntry) {
    ({ options: compilerOptions, rootNames } = cachedEntry);
  } else {
    const configFile = ts.findConfigFile(dir, (f) => ts.sys.fileExists(f));
    compilerOptions = { noEmit: true };
    rootNames = [];
    if (configFile) {
      const readResult = ts.readConfigFile(configFile, (f) =>
        ts.sys.readFile(f),
      );
      const parsed = ts.parseJsonConfigFileContent(
        readResult.config as object,
        ts.sys,
        path.dirname(configFile),
      );
      compilerOptions = { ...parsed.options, noEmit: true };
      rootNames = parsed.fileNames;
    }
    compilerOptionsCache.set(dir, { options: compilerOptions, rootNames });
  }

  // Build the program from all tsconfig-included files so that subsequent
  // files in the same project reuse a single program instance.
  const allRootNames = rootNames.length > 0 ? rootNames : [filePath];
  const program = ts.createProgram(
    allRootNames,
    compilerOptions,
    undefined,
    cachedProgram,
  );
  programCache.set(dir, program);
  return program;
};

export const applyJestFixes = async (
  filePath: string,
  content: string,
): Promise<string> => {
  if (!filePath.includes('test')) {
    return content;
  }

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
      // Single traversal to resolve all needed positions at once.
      const callPositions = new Set(
        callsToCheck.map(({ callNode }) => callNode.range().start.index),
      );
      const fnRefPositions = new Set(
        fnRefCallsToCheck.map(({ fnRefNode }) => fnRefNode.range().start.index),
      );
      const tsCallMap = new Map<number, ts.CallExpression>();
      const tsFnRefMap = new Map<number, ts.Node>();

      const collectTsNodes = (node: ts.Node): void => {
        const start = node.getStart();
        if (callPositions.has(start) && ts.isCallExpression(node)) {
          tsCallMap.set(start, node);
        }
        if (
          fnRefPositions.has(start) &&
          (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node))
        ) {
          tsFnRefMap.set(start, node);
        }
        ts.forEachChild(node, collectTsNodes);
      };
      collectTsNodes(tsSourceFile);

      const getSymbolCacheKey = (node: ts.Node): string | undefined => {
        let symbol = checker.getSymbolAtLocation(node);
        if (!symbol) {
          return undefined;
        }
        if (symbol.flags & ts.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol);
        }
        const decl = symbol.declarations?.[0];
        if (!decl) {
          return undefined;
        }
        return `${decl.getSourceFile().fileName}:${symbol.name}`;
      };

      const isPromiseReturning = (callNode: SgNode): boolean => {
        const tsCall = tsCallMap.get(callNode.range().start.index);
        if (!tsCall) {
          return false;
        }
        const cacheKey = getSymbolCacheKey(tsCall.expression);
        const cached =
          cacheKey !== undefined ? promiseCheckCache.get(cacheKey) : undefined;
        if (cached !== undefined) {
          return cached;
        }
        const result =
          checker.getTypeAtLocation(tsCall).getSymbol()?.getName() ===
          'Promise';
        if (cacheKey !== undefined) {
          promiseCheckCache.set(cacheKey, result);
        }
        return result;
      };

      const isFunctionRefReturningPromise = (fnRefNode: SgNode): boolean => {
        const tsNode = tsFnRefMap.get(fnRefNode.range().start.index);
        if (!tsNode) {
          return false;
        }
        const cacheKey = getSymbolCacheKey(tsNode);
        const cached =
          cacheKey !== undefined ? promiseCheckCache.get(cacheKey) : undefined;
        if (cached !== undefined) {
          return cached;
        }
        const type = checker.getTypeAtLocation(tsNode);
        let result = false;
        for (const sig of type.getCallSignatures()) {
          const retType = checker.getReturnTypeOfSignature(sig);
          if (retType.getSymbol()?.getName() === 'Promise') {
            result = true;
            break;
          }
        }
        if (cacheKey !== undefined) {
          promiseCheckCache.set(cacheKey, result);
        }
        return result;
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
