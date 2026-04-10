import { Edit, parseAsync } from '@ast-grep/napi';
import ts from 'typescript';

const getTsConfig = () => {
  const configFilePath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
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

let tsConfigCache: ts.CompilerOptions | undefined = undefined;

export const applyJestFixes = async (file: string, content: string) => {
  if (!file.includes('test')) {
    return content;
  }

  const astRoot = (await parseAsync('TypeScript', content)).root();

  const lastStatementsInLifeCycleHooks = astRoot.findAll({
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
    return content;
  }

  if (!tsConfigCache) {
    tsConfigCache = getTsConfig() ?? {
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: false,
      noEmit: true,
    };
  }

  const program = ts.createProgram([file], tsConfigCache);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(file);

  if (!sourceFile) {
    return content;
  }

  const tsCallExpressionsByPos = getTsCallExpressionsByPos(sourceFile);

  const edits: Edit[] = [];

  lastStatementsInLifeCycleHooks.forEach((statement) => {
    const pos = statement.range().start.index;
    const tsNode = tsCallExpressionsByPos.get(pos);
    if (!tsNode) return;

    const type = checker.getTypeAtLocation(tsNode);
    const typeString = checker.typeToString(type);

    if (typeString.startsWith('Promise<')) {
      edits.push(statement.replace(`await ${statement.text()}`));

      const arrowFunction = statement.parent()?.parent()?.parent();

      if (arrowFunction && arrowFunction.kind() === 'arrow_function') {
        edits.push({
          startPos: arrowFunction.range().start.index,
          endPos: arrowFunction.range().start.index,
          insertedText: 'async ',
        });
      }
    }
  });

  if (!edits.length) {
    return content;
  }

  return astRoot.commitEdits(edits);
};
