import ts from 'typescript';

import { formatPrettier } from './prettier.js';

type Props = ts.NodeArray<ts.ObjectLiteralElementLike>;

type Transformer<T> = (context: ts.TransformationContext | null, props: T) => T;

const BLANK_LINE_PLACEHOLDER = ' __BLANK_LINE_PLACEHOLDER__';
const BLANK_LINE_REGEXP = new RegExp(`//${BLANK_LINE_PLACEHOLDER}`, 'g');

/**
 * Append a placeholder comment to the start of a node.
 *
 * Blank lines can be annotated and preserved through the TypeScript printer
 * when this is paired with a dodgy `String.prototype.replace` post-processor.
 */
const withLeadingBlankLinePlaceholder = <T extends ts.Node>(node: T) =>
  ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.SingleLineCommentTrivia,
    BLANK_LINE_PLACEHOLDER,
    true,
  );

/**
 * Create the following expression:
 *
 * ```javascript
 * export default {};
 * ```
 */
const createExportDefaultObjectLiteralExpression = (
  factory: ts.NodeFactory,
  props: Props,
  callExpression?: ts.Expression,
): ts.ExportAssignment =>
  factory.createExportAssignment(
    undefined,
    undefined,
    callExpression === undefined
      ? factory.createObjectLiteralExpression(props, true)
      : factory.createCallExpression(callExpression, undefined, [
          factory.createObjectLiteralExpression(props, true),
        ]),
  );

const createImportFromExpression = (
  factory: ts.NodeFactory,
  moduleName: string,
  importNames: string | string[],
) => {
  const importClause =
    typeof importNames === 'string'
      ? factory.createImportClause(
          false,
          factory.createIdentifier(importNames),
          undefined,
        )
      : factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports(
            importNames.map((importName) =>
              factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier(importName),
              ),
            ),
          ),
        );

  return factory.createImportDeclaration(
    undefined,
    importClause,
    factory.createStringLiteral(moduleName),
  );
};

const getPropName = (prop: ts.ObjectLiteralElementLike) =>
  ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
    ? prop.name.escapedText.toString()
    : undefined;

const expressionAsDefaultExport = (
  context: ts.TransformationContext,
  transformProps: Transformer<Props>,
  expression: ts.Expression,
): ts.ExportAssignment | null =>
  withLeadingBlankLinePlaceholder(
    (() => {
      // {}
      if (ts.isObjectLiteralExpression(expression)) {
        const props = transformProps(context, expression.properties);

        return createExportDefaultObjectLiteralExpression(
          context.factory,
          props,
        );
      }

      // fn({})
      if (
        ts.isCallExpression(expression) &&
        expression.arguments.length === 1 &&
        expression.arguments[0]
      ) {
        const [firstArgument] = expression.arguments;

        if (ts.isObjectLiteralExpression(firstArgument)) {
          const props = transformProps(context, firstArgument.properties);

          return createExportDefaultObjectLiteralExpression(
            context.factory,
            props,
            expression.expression,
          );
        }
      }

      // Anything else
      return context.factory.createExportAssignment(
        undefined,
        undefined,
        expression,
      );
    })(),
  );

/**
 * Mutate `const x = require('')` into `import x from ''`:
 *
 * ```javascript
 * const x = require('');
 *
 * const { x } = require('');
 * ```
 *
 * There's no recursion needed here as we expect the import statement to be a
 * top-level node and therefore an immediate child of the source file.
 */
const requireImportsTransformer: ts.TransformerFactory<ts.Node> =
  (context) => (rootNode) =>
    ts.visitEachChild(
      rootNode,
      (node) => {
        let declaration, moduleName;

        if (
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.length === 1 &&
          node.declarationList.declarations[0] &&
          ts.isVariableDeclaration(
            (declaration = node.declarationList.declarations[0]),
          ) &&
          declaration.initializer &&
          ts.isCallExpression(declaration.initializer) &&
          declaration.initializer.arguments.length === 1 &&
          declaration.initializer.arguments[0] &&
          ts.isStringLiteral(
            (moduleName = declaration.initializer.arguments[0]),
          ) &&
          ts.isIdentifier(declaration.initializer.expression) &&
          declaration.initializer.expression.text === 'require'
        ) {
          // const x
          if (ts.isIdentifier(declaration.name)) {
            return createImportFromExpression(
              context.factory,
              moduleName.text,
              declaration.name.text,
            );
          }

          // const { x }
          if (ts.isObjectBindingPattern(declaration.name)) {
            return createImportFromExpression(
              context.factory,
              moduleName.text,
              declaration.name.elements.flatMap((element) =>
                ts.isIdentifier(element.name) ? [element.name.text] : [],
              ),
            );
          }
        }

        return node;
      },
      context,
    );

/**
 * Create a transformer to mutate `module.exports` and `export default`:
 *
 * ```javascript
 * export default {};
 *
 * module.exports = {};
 * ```
 *
 * If the export is a call expression with a single argument, it will try to
 * transform the props of that argument.
 *
 * ```javascript
 * module.exports = fn({});
 * ```
 *
 * There's no recursion needed here as we expect the export statement to be a
 * top-level node and therefore an immediate child of the source file.
 */
const createModuleExportsTransformer =
  (transformProps: Transformer<Props>): ts.TransformerFactory<ts.Node> =>
  (context) =>
  (rootNode) =>
    ts.visitEachChild(
      rootNode,
      (node) => {
        // module.exports =
        if (
          ts.isExpressionStatement(node) &&
          ts.isBinaryExpression(node.expression) &&
          ts.isPropertyAccessExpression(node.expression.left) &&
          ts.isIdentifier(node.expression.left.expression) &&
          node.expression.left.expression.escapedText.toString() === 'module' &&
          node.expression.left.name.text === 'exports' &&
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          return (
            expressionAsDefaultExport(
              context,
              transformProps,
              node.expression.right,
            ) ?? node
          );
        }

        // export default
        if (ts.isExportAssignment(node)) {
          return (
            expressionAsDefaultExport(
              context,
              transformProps,
              node.expression,
            ) ?? node
          );
        }

        return node;
      },
      context,
    );

/**
 * Create a transformer to filter out unspecified props from an object literal.
 */
export const createPropFilter =
  (names: string[]): Transformer<Props> =>
  (context, props) => {
    const nameSet = new Set<unknown>(names);

    const factory = context?.factory ?? ts.factory;

    return factory.createNodeArray(
      props.filter((prop) => nameSet.has(getPropName(prop))),
    );
  };

export const createPropAppender =
  (appendingProps: Props): Transformer<Props> =>
  (context, props) => {
    const nameSet = new Set<unknown>(
      props.map(getPropName).filter((prop) => typeof prop === 'string'),
    );

    const factory = context?.factory ?? ts.factory;

    return factory.createNodeArray([
      ...props,
      ...appendingProps.filter((prop) => !nameSet.has(getPropName(prop))),
    ]);
  };

/**
 * Read out `export default` or `module.exports` props from a source file.
 *
 * The props can then be used when transforming another source file.
 */
export const readModuleExports = async (
  inputFile: string,
): Promise<Props | undefined> => {
  let result: Props | undefined;

  await transformModuleImportsAndExports(
    inputFile,
    (_, props) => (result = props),
  );

  return result;
};

/**
 * Mutate imports and exports in a source file:
 *
 * - Convert `const x = require('')` into `import x from ''`
 * - Convert `module.exports =` into `export default`
 * - Run a transformer over the exported props
 */
export const transformModuleImportsAndExports = async (
  inputFile: string,
  transformProps: Transformer<Props>,
): Promise<string> => {
  const sourceFile = ts.createSourceFile('', inputFile, ts.ScriptTarget.Latest);

  const moduleExportsTransformer =
    createModuleExportsTransformer(transformProps);

  const result = ts.transform(sourceFile, [
    requireImportsTransformer,
    moduleExportsTransformer,
  ]);

  const [transformedFile] = result.transformed;

  if (!transformedFile) {
    throw new Error(
      `Could not get transformed result for ${JSON.stringify(result)}`,
    );
  }

  const text = ts
    .createPrinter()
    .printNode(ts.EmitHint.SourceFile, transformedFile, sourceFile)
    .replace(BLANK_LINE_REGEXP, '');

  return formatPrettier(text, { parser: 'typescript' });
};
