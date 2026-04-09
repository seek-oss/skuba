import path from 'node:path';

import { parseAsync } from '@ast-grep/napi';
import ts from 'typescript';

export const applyJestFixes = async (file: string, content: string) => {
  if (!file.includes('test')) {
    return content;
  }

  const astRoot = (await parseAsync('TypeScript', content)).root();

  const lastStatementsInLifeCycleHooks = astRoot.findAll({
    rule: {
      kind: 'call_expression',
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
};
