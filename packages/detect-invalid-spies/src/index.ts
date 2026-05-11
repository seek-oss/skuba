/**
 * Detects Jest/Vitest spy usage patterns where the spied function is also
 * referenced internally within the same module it is exported from.
 *
 * When `jest.spyOn` / `vi.spyOn` replaces the module export binding, any
 * calls to `fn` made from within that same module still use the original local
 * binding and are therefore NOT intercepted by the spy. This makes the mock
 * ineffective for indirect callers and can cause subtle failures, especially
 * when migrating to Vitest where module mocking semantics differ.
 *
 * Example of the problematic pattern:
 *
 * ```ts
 * // http.ts
 * export const createServiceAuthHeaders = createIssuer(fetcher);
 *
 * export const createServiceAuthClient = ({ baseUrl }) =>
 *   new Gaxios({
 *     adapter: async (options, defaultAdapter) => {
 *       // ← this call uses the local binding, NOT the module export
 *       const headers = await createServiceAuthHeaders(audience);
 *       ...
 *     },
 *   });
 *
 * // spy.ts
 * import * as s2s from '#src/framework/http.js';
 *
 * export const mockServiceAuthHeaders = () =>
 *   jest.spyOn(s2s, 'createServiceAuthHeaders') // ← spy won't intercept http.ts-internal calls
 *     .mockResolvedValue({ authorization: 'Bearer token' });
 * ```
 */

import path from 'node:path';
import process from 'node:process';

import { type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';
import ts from 'typescript';

export type SameFileSpyWarning = {
  /** The file that contains the `jest.spyOn` call. */
  testFile: string;
  /** The raw import specifier used in the namespace import, e.g. `#src/framework/http.js`. */
  importSpecifier: string;
  /** The absolute path of the module being spied on, after TypeScript resolution. */
  resolvedFile: string;
  /** The name of the function being spied on. */
  spiedFunction: string;
};

/**
 * Scans TypeScript files under `dir` (default: `process.cwd()`) and returns
 * all instances where `jest.spyOn` or `vi.spyOn` targets a function that is
 * also used internally within the same source module, meaning the spy will not
 * intercept those internal calls.
 */
export const detectSameFileSpyUsage = async (
  dir: string = process.cwd(),
): Promise<SameFileSpyWarning[]> => {
  const filePaths = await fg(['**/*.ts', '**/*.tsx'], {
    absolute: true,
    cwd: dir,
    ignore: ['**/.git', '**/node_modules'],
  });

  const results = await Promise.all(
    filePaths.map((filePath) => analyzeFileForSpyUsage(filePath)),
  );

  return results.flat();
};

// ---------------------------------------------------------------------------
// File-level analysis
// ---------------------------------------------------------------------------

const analyzeFileForSpyUsage = async (
  filePath: string,
): Promise<SameFileSpyWarning[]> => {
  let content: string;
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const ast = await parseAsync('TypeScript', content);
  const root = ast.root();

  // Quick bail-out: no spy calls in this file
  const spyOnCalls = root.findAll({
    rule: {
      kind: 'call_expression',
      regex: '^(jest|vi)\.spyOn',
    },
  });

  if (spyOnCalls.length === 0) {
    return [];
  }

  const compilerOptions = loadCompilerOptions(filePath);
  const warnings: SameFileSpyWarning[] = [];

  for (const spyCall of spyOnCalls) {
    const warning = await analyzeSpyCall(
      spyCall,
      filePath,
      root,
      compilerOptions,
    );
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings;
};

// ---------------------------------------------------------------------------
// Single call-expression analysis
// ---------------------------------------------------------------------------

const analyzeSpyCall = async (
  spyCall: SgNode,
  filePath: string,
  root: SgNode,
  compilerOptions: ts.CompilerOptions,
): Promise<SameFileSpyWarning | undefined> => {
  const args = spyCall.children().find((c) => c.kind() === 'arguments');
  if (!args) {
    return undefined;
  }

  // arguments node children: '(', arg1, ',', arg2, ..., ')'
  const argList = args
    .children()
    .filter((c) => c.kind() !== '(' && c.kind() !== ')' && c.kind() !== ',');

  // We need at least two arguments: the namespace object and the method name.
  // Outer chained calls (e.g. .mockResolvedValue) only have 1 argument.
  if (argList.length < 2) {
    return undefined;
  }

  const namespaceNode = argList[0];
  const methodNode = argList[1];

  if (!namespaceNode || !methodNode) {
    return undefined;
  }

  const namespaceName = namespaceNode.text().trim();
  // Strip surrounding quotes  (" ' `)
  const spiedFunction = methodNode.text().replace(/^['"`]|['"`]$/g, '');

  // Find: import * as <namespaceName> from '<specifier>'
  const importStatement = root.find({
    rule: {
      kind: 'import_statement',
      has: {
        kind: 'import_clause',
        has: {
          kind: 'namespace_import',
          has: {
            kind: 'identifier',
            regex: `^${namespaceName}$`,
          },
        },
      },
    },
  });

  if (!importStatement) {
    return undefined;
  }

  // The string literal child of the import_statement is the module specifier.
  const specifierNode = importStatement
    .children()
    .find((c) => c.kind() === 'string');
  if (!specifierNode) {
    return undefined;
  }

  const specifier = specifierNode.text().replace(/^['"`]|['"`]$/g, '');

  // Resolve the specifier to an absolute file path via the TypeScript resolver.
  // This handles `#src/...` subpath imports, path aliases, and custom conditions.
  const resolved = ts.resolveModuleName(
    specifier,
    path.resolve(filePath),
    compilerOptions,
    ts.sys,
  );

  const resolvedFile = resolved.resolvedModule?.resolvedFileName;
  if (!resolvedFile || resolvedFile.includes('/node_modules/')) {
    return undefined;
  }

  // Check whether the spied function appears as an internal usage in the
  // resolved module (i.e. referenced somewhere other than its own declaration).
  const internallyUsed = await isFunctionUsedInternally(
    resolvedFile,
    spiedFunction,
  );

  if (!internallyUsed) {
    return undefined;
  }

  const warning: SameFileSpyWarning = {
    testFile: filePath,
    importSpecifier: specifier,
    resolvedFile,
    spiedFunction,
  };

  return warning;
};

// ---------------------------------------------------------------------------
// Internal-usage check
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `functionName` is referenced in `filePath` at least once
 * outside of its own declaration — meaning the module's internal code binds
 * to the local symbol rather than the exported binding.
 */
const isFunctionUsedInternally = async (
  filePath: string,
  functionName: string,
): Promise<boolean> => {
  let content: string;
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch {
    return false;
  }

  const ast = await parseAsync('TypeScript', content);
  const root = ast.root();

  // Find every identifier whose text exactly matches the function name.
  const identifiers = root.findAll({
    rule: {
      kind: 'identifier',
      regex: `^${functionName}$`,
    },
  });

  for (const id of identifiers) {
    const parent = id.parent();
    if (!parent) {
      continue;
    }

    const parentKind = parent.kind();

    // Skip the declaration name inside `variable_declarator` (`const name = …`).
    // The name is always the very first child of the declarator node.
    if (parentKind === 'variable_declarator') {
      const firstChild = parent.children()[0];
      if (firstChild?.range().start.index === id.range().start.index) {
        continue;
      }
    }

    // Skip `function functionName() { … }` declarations.
    if (parentKind === 'function_declaration') {
      continue;
    }

    // Skip import/export specifiers (`import { functionName }`, `export { functionName }`).
    if (
      parentKind === 'import_specifier' ||
      parentKind === 'export_specifier' ||
      parentKind === 'namespace_import'
    ) {
      continue;
    }

    // Skip TypeScript type-level references.
    if (
      parentKind === 'type_identifier' ||
      parentKind === 'type_query' ||
      parentKind === 'property_signature'
    ) {
      continue;
    }

    // Any other position is a runtime reference to the local binding.
    return true;
  }

  return false;
};

// ---------------------------------------------------------------------------
// TypeScript compiler options helper
// ---------------------------------------------------------------------------

const loadCompilerOptions = (filePath: string): ts.CompilerOptions => {
  const configFile = ts.findConfigFile(
    path.dirname(path.resolve(filePath)),
    (f) => ts.sys.fileExists(f),
  );

  if (!configFile) {
    return { noEmit: true };
  }

  const readResult = ts.readConfigFile(configFile, (f) => ts.sys.readFile(f));

  if (readResult.error) {
    return { noEmit: true };
  }

  const { options } = ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    path.dirname(configFile),
  );

  return { ...options, noEmit: true };
};

/* istanbul ignore next: temp test please remove */
void null;
