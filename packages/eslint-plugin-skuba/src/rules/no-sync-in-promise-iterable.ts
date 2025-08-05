import { ESLintUtils, type TSESLint, TSESTree } from '@typescript-eslint/utils';

type TypeChecker = ReturnType<
  NonNullable<
    ReturnType<typeof ESLintUtils.getParserServices>['program']
  >['getTypeChecker']
>;

type Type = ReturnType<TypeChecker['getTypeOfSymbolAtLocation']>;

/**
 * Whether a TypeScript type is a Promise-like "thenable".
 */
const isThenableType = (type: Type, checker: TypeChecker): boolean => {
  // Return early if the type appears to be a Promise
  if (type.symbol && type.symbol.name === 'Promise') {
    return true;
  }

  // For a non-union type, check that the type is a thenable
  const thenSymbol = type.getProperty('then');
  if (thenSymbol?.valueDeclaration) {
    const thenType = checker.getTypeOfSymbolAtLocation(
      thenSymbol,
      thenSymbol.valueDeclaration,
    );
    // Naively assume that `then` being a function indicates a Promise-like type
    if (thenType.getCallSignatures().length) {
      return true;
    }
  }

  // For a union type, check that all members are Promise-like
  if (type.isUnion()) {
    return type.types.every((t) => isThenableType(t, checker));
  }

  return false;
};

/**
 * Whether a node represents a Promise-like "thenable".
 */
const isThenableNode = (
  node: TSESTree.Node,
  esTreeNodeToTSNodeMap: ESTreeNodeToTSNodeMap,
  checker: TypeChecker,
) => {
  const tsNode = esTreeNodeToTSNodeMap.get(node);

  const type = checker.getTypeAtLocation(tsNode);

  return isThenableType(type, checker);
};

const SAFE_ISH_FUNCTIONS = new Set([
  'Boolean',
  'isFinite',
  'isNaN',
  'Number',
  'parseFloat',
  'parseInt',
  'String',
  'Symbol',
]);

const SAFE_ISH_STATIC_METHODS: Record<string, Set<string>> = {
  Array: new Set(['isArray']),
  Date: new Set(['now', 'parse', 'UTC']),
  Number: new Set([
    'isFinite',
    'isInteger',
    'isNaN',
    'isSafeInteger',
    'parseFloat',
    'parseInt',
  ]),
  Object: new Set([
    'entries',
    'fromEntries',
    'groupBy',
    'hasOwn',
    'is',
    'keys',
    'values',
  ]),
};

/**
 * Whether a call expression represents a safe-ish built-in.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
 */
const isSafeIshBuiltIn = (node: TSESTree.CallExpression): boolean => {
  if (node.callee.type === TSESTree.AST_NODE_TYPES.Identifier) {
    return SAFE_ISH_FUNCTIONS.has(node.callee.name);
  }

  if (node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
    const { object, property } = node.callee;

    if (
      object.type === TSESTree.AST_NODE_TYPES.Identifier &&
      property.type === TSESTree.AST_NODE_TYPES.Identifier
    ) {
      return SAFE_ISH_STATIC_METHODS[object.name]?.has(property.name) ?? false;
    }
  }

  return false;
};

/**
 * Whether a call expression represents a safe-ish builder.
 *
 * This is currently overfitted to `knex`.
 */
const isSafeIshBuilder = (node: TSESTree.CallExpression): boolean => {
  if (
    node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === TSESTree.AST_NODE_TYPES.CallExpression
  ) {
    return isSafeIshBuilder(node.callee.object);
  }

  if (
    node.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
    node.callee.name === 'knex'
  ) {
    return true;
  }

  return false;
};

/**
 * The nodes traversable from the current AST position containing logic with a
 * reasonable chance of throwing a synchronous error.
 */
const possibleNodesWithSyncError = (
  node: TSESTree.Node,
  esTreeNodeToTSNodeMap: ESTreeNodeToTSNodeMap,
  checker: TypeChecker,
  sourceCode: Readonly<TSESLint.SourceCode>,
  visited: Set<string>,
): TSESTree.Node[] => {
  switch (node.type) {
    case TSESTree.AST_NODE_TYPES.ArrayExpression:
      // Traverse array to check if each element may throw
      return node.elements.flatMap((arg) =>
        arg
          ? possibleNodesWithSyncError(
              arg,
              esTreeNodeToTSNodeMap,
              checker,
              sourceCode,
              visited,
            )
          : [],
      );

    case TSESTree.AST_NODE_TYPES.AssignmentExpression:
      // Traverse `a = fn()` assuming only the right-hand side may throw
      return possibleNodesWithSyncError(
        node.right,
        esTreeNodeToTSNodeMap,
        checker,
        sourceCode,
        visited,
      );

    case TSESTree.AST_NODE_TYPES.BinaryExpression:
    case TSESTree.AST_NODE_TYPES.LogicalExpression:
      // Check both sides of e.g. `a() && b()`
      return [node.left, node.right].flatMap((arg) =>
        possibleNodesWithSyncError(
          arg,
          esTreeNodeToTSNodeMap,
          checker,
          sourceCode,
          visited,
        ),
      );

    case TSESTree.AST_NODE_TYPES.CallExpression:
      if (isSafeIshBuilder(node)) {
        return [];
      }

      // Allow common safe-ish built-ins and Promise-like return types
      if (
        isSafeIshBuiltIn(node) ||
        isThenableNode(node, esTreeNodeToTSNodeMap, checker)
      ) {
        return node.arguments.flatMap((arg) =>
          possibleNodesWithSyncError(
            arg,
            esTreeNodeToTSNodeMap,
            checker,
            sourceCode,
            visited,
          ),
        );
      }

      // Assume other synchronous calls may throw
      return [node];

    case TSESTree.AST_NODE_TYPES.ChainExpression:
      // Traverse the optional chaining
      return possibleNodesWithSyncError(
        node.expression,
        esTreeNodeToTSNodeMap,
        checker,
        sourceCode,
        visited,
      );

    case TSESTree.AST_NODE_TYPES.ConditionalExpression:
      // Traverse `test() ? a() : b()` assuming any component may throw
      return [node.test, node.consequent, node.alternate].flatMap((arg) =>
        possibleNodesWithSyncError(
          arg,
          esTreeNodeToTSNodeMap,
          checker,
          sourceCode,
          visited,
        ),
      );

    case TSESTree.AST_NODE_TYPES.Identifier:
      const expression = findExpression(node, sourceCode, visited);

      return expression
        ? possibleNodesWithSyncError(
            expression,
            esTreeNodeToTSNodeMap,
            checker,
            sourceCode,
            visited,
          )
        : [];

    case TSESTree.AST_NODE_TYPES.Literal:
      return [];

    case TSESTree.AST_NODE_TYPES.NewExpression:
      // Allow `new Promise`
      if (
        node.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.callee.name === 'Promise'
      ) {
        return [];
      }

      // Assume other constructors may throw
      return [node];

    case TSESTree.AST_NODE_TYPES.SequenceExpression:
      // Traverse sequence to check if each expression may throw
      return node.expressions.flatMap((arg) =>
        possibleNodesWithSyncError(
          arg,
          esTreeNodeToTSNodeMap,
          checker,
          sourceCode,
          visited,
        ),
      );

    case TSESTree.AST_NODE_TYPES.SpreadElement:
      // Traverse spread element
      return possibleNodesWithSyncError(
        node.argument,
        esTreeNodeToTSNodeMap,
        checker,
        sourceCode,
        visited,
      );

    case TSESTree.AST_NODE_TYPES.TaggedTemplateExpression:
      // Assume the tag function may throw
      return [node];

    case TSESTree.AST_NODE_TYPES.TemplateLiteral:
      // Check for e.g. `prefix ${syncFn()} suffix`
      return node.expressions.flatMap((arg) =>
        possibleNodesWithSyncError(
          arg,
          esTreeNodeToTSNodeMap,
          checker,
          sourceCode,
          visited,
        ),
      );

    // Commented out to allow property access
    // Assume we will flag custom getters separately to prevent such errors
    // case TSESTree.AST_NODE_TYPES.MemberExpression:
    //   return isThenableNode(node, esTreeNodeToTSNodeMap, checker) ? [] : [node];
  }

  return [];
};

const checkIterableForSyncErrors = (
  elements: Array<ArrayElement | null>,
  method: string,
  context: Context,
  esTreeNodeToTSNodeMap: ESTreeNodeToTSNodeMap,
  checker: TypeChecker,
): void =>
  elements.forEach((element, index) => {
    // Skip sparse elements like `[,,]` as they are harmless
    if (!element) {
      return;
    }

    // Skip the first element as it doesn't leave any previous promises dangling
    if (index === 0 && element.type !== TSESTree.AST_NODE_TYPES.SpreadElement) {
      return;
    }

    const nodes = possibleNodesWithSyncError(
      element,
      esTreeNodeToTSNodeMap,
      checker,
      context.sourceCode,
      new Set<string>(),
    );

    for (const node of nodes) {
      context.report({
        node,
        messageId: 'mayThrowSyncError',
        data: {
          method,
          value: context.sourceCode.getText(element),
        },
      });
    }
  });

const findExpression = (
  node: TSESTree.Identifier,
  sourceCode: Readonly<TSESLint.SourceCode>,
  visited: Set<string>,
): TSESTree.Expression | undefined => {
  const scope = sourceCode.getScope(node);

  // Look for variable in current and parent scopes
  let currentScope: TSESLint.Scope.Scope | null = scope;
  do {
    const variable = currentScope.set.get(node.name);

    const definition = variable?.defs[0];
    if (!definition) {
      continue;
    }

    // Prevent infinite loops by tracking visited variables
    if (visited.has(variable.name)) {
      return;
    }

    visited.add(variable.name);

    if (
      definition.node.type === TSESTree.AST_NODE_TYPES.VariableDeclarator &&
      definition.node.init &&
      [
        TSESTree.AST_NODE_TYPES.ArrayExpression,
        TSESTree.AST_NODE_TYPES.Identifier,
      ].includes(definition.node.init.type)
    ) {
      return definition.node.init;
    }
  } while ((currentScope = currentScope.upper));

  return;
};

const resolveArrayElements = (
  node: TSESTree.CallExpressionArgument,
  sourceCode: Readonly<TSESLint.SourceCode>,
  visited = new Set<string>(),
): Array<ArrayElement | null> => {
  // Handle direct array expressions like `Promise.all([1, 2])`
  if (node.type === TSESTree.AST_NODE_TYPES.ArrayExpression) {
    return node.elements;
  }

  // Handle indirection like `const promises = [1, 2]; Promise.all(promises)`
  if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
    const expression = findExpression(node, sourceCode, visited);

    if (expression) {
      return resolveArrayElements(expression, sourceCode, visited);
    }
  }

  return [];
};

export interface PluginDocs {
  description: string;
  recommended?: boolean;
  requiresTypeChecking?: boolean;
}

// eslint-disable-next-line new-cap
export const createRule = ESLintUtils.RuleCreator<PluginDocs>(
  (name) =>
    `https://github.com/seek-oss/skuba/tree/main/docs/eslint-plugin/${name}.md`,
);

type MessageId = 'mayThrowSyncError';

type Context = TSESLint.RuleContext<MessageId, []>;

type ArrayElement = TSESTree.SpreadElement | TSESTree.Expression;

type ESTreeNodeToTSNodeMap = ReturnType<
  typeof ESLintUtils.getParserServices
>['esTreeNodeToTSNodeMap'];

export default createRule({
  defaultOptions: [],
  name: 'no-sync-in-promise-iterable',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Heuristically flags synchronous logic in the iterable argument of static Promise methods that could leave preceding promises dangling',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      mayThrowSyncError:
        '{{value}} may synchronously throw an error and leave preceding promises dangling. Evaluate synchronous expressions before constructing the iterable argument to Promise.{{method}}.',
    },
  },
  create: (context) => {
    const { esTreeNodeToTSNodeMap, program } =
      ESLintUtils.getParserServices(context);

    const checker = program.getTypeChecker();

    return {
      CallExpression: (node) => {
        // Ensure this is a static `Promise` method call
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods
        if (
          !(
            node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
            node.callee.object.type === TSESTree.AST_NODE_TYPES.Identifier &&
            node.callee.object.name === 'Promise' &&
            node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
            ['all', 'allSettled', 'any', 'race'].includes(
              node.callee.property.name,
            )
          )
        ) {
          return;
        }

        const method = node.callee.property.name;

        const iterableArg = node.arguments[0];

        // Gracefully handle a lack of arguments like `Promise.all()`
        // The TypeScript compiler should flag such instances separately
        if (!iterableArg) {
          return;
        }

        const elements = resolveArrayElements(iterableArg, context.sourceCode);

        checkIterableForSyncErrors(
          elements,
          method,
          context,
          esTreeNodeToTSNodeMap,
          checker,
        );
      },
    };
  },
});
