import * as test from 'node:test';

import { RuleTester } from '@typescript-eslint/rule-tester';

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;
RuleTester.itOnly = test.it.only;

import rule from './no-sync-in-promise-iterable.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
      tsconfigRootDir: __dirname,
    },
  },
});

const methods = ['all', 'allSettled', 'any', 'race'];

ruleTester.run('no-sync-in-promise-iterable', rule, {
  valid: methods.flatMap((method) => [
    {
      code: `Promise.${method}()`,
    },
    {
      code: `Promise.${method}([])`,
    },
    {
      code: `Promise.${method}([,,])`,
    },
    {
      code: `Promise.${method}([1, 2, 3])`,
    },
    {
      code: `Promise.${method}([1, true, null, NaN, "hello", undefined])`,
    },
    {
      code: `
        const syncFn = () => undefined;
        Promise.${method}([syncFn(), 2, 3]);
      `,
    },
    {
      code: `Promise.${method}([1, Promise.resolve(), 3])`,
    },
    {
      code: `
        const asyncFn = async () => {
          return 2;
        };
        Promise.${method}([1, asyncFn(), 3]);
      `,
    },
    // New expressions (constructors)
    {
      code: `Promise.${method}([, new Boolean()])`,
    },
    {
      code: `Promise.${method}([, new Date('Construct Invalid Date')])`,
    },
    {
      code: `Promise.${method}([, new Error('Badness!')])`,
    },
    {
      code: `Promise.${method}([, new Number('Construct NaN')])`,
    },
    // Avoid traversal outside of iterable argument scope
    {
      code: `
        const fn = (xs: string[]) => xs.join(', ');
        const value = fn(['a', 'b', 'c']);
        Promise.${method}([1, value]);
      `,
    },
    // Untagged template literal
    {
      code: `Promise.${method}([1, \`template\${2}\`, 3])`,
    },
    // Arrow function without execution
    {
      code: `Promise.${method}([1, () => 2, 3])`,
    },
    // Spread element with safe values
    {
      code: `
        const arr = [1, 2];
        Promise.${method}([...arr, 3]);
      `,
    },
    // Unrelated methods
    {
      code: `/* no Promise.${method} */ SomeOther.all([1, syncFn(), 3])`,
    },
    {
      code: `/* no Promise.${method} */ Promise.then([1, syncFn(), 3])`,
    },
    // Complex thenable expression
    {
      code: `
        const p1 = () => Promise.resolve();
        const p2 = p1;
        const p3 = p2;
        Promise.${method}([1, p3().then(() => 2), 3]);
      `,
    },
    // Await expression in async context
    {
      code: `
        async function test() {
          const result = await Promise.resolve([1, 2]);
          Promise.${method}([1, ...result, 3]);
        }
      `,
    },
    // Member expression (we will flag custom getters elsewhere)
    {
      code: `Promise.${method}([1, obj.prop, 3])`,
    },
    // Safe built-in functions
    {
      code: `Promise.${method}([1, Boolean(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Number(value), 3])`,
    },
    {
      code: `Promise.${method}([1, String(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Array.isArray(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Number.isInteger(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Number.isNaN(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Number.isFinite(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Object.is(a, b), 3])`,
    },
    {
      code: `Promise.${method}([1, Object.keys(obj), 3])`,
    },
    {
      code: `Promise.${method}([1, array[index], 3])`,
    },
    // Binary and logical expressions
    {
      code: `Promise.${method}([1, a + b, 3])`,
    },
    {
      code: `Promise.${method}([1, a && b, 3])`,
    },
    {
      code: `Promise.${method}([1, a || b, 3])`,
    },
    // Update expression
    {
      code: `Promise.${method}([1, ++counter, 3])`,
    },
    // Unary expression
    {
      code: `Promise.${method}([1, !someValue, 3])`,
    },
    // Array instance methods
    {
      code: `const fn = (xs: string[]) => Promise.${method}(xs.map(async () => undefined));`,
    },
    {
      code: `Promise.${method}([1, Array.from(iterable).map(async () => undefined), 3])`,
    },
    {
      code: `
        const set = new Set([1, 2, 3]);
        Promise.${method}([1, ...set.entries().map(async () => undefined), 3]);
      `,
    },
    // IIFE
    {
      code: `Promise.${method}([1, (async () => fail())()]);`,
    },
    // Simple function expression
    {
      code: `
        const xs = [1, 2, 3];
        const fn = (x: number) => x * 2;
        Promise.${method}([1, xs.map(() => fn(x)), 3]);
      `,
    },
    // Object/function instance method
    {
      code: `Promise.${method}([1, [1, 2].map(x => x.toString())]);`,
    },
    {
      code: `Promise.${method}([1, [1, 2].map(x => x.toLocaleString())]);`,
    },
    {
      code: `const fn = () => undefined; Promise.${method}([1, fn.call()]);`,
    },
    {
      code: `const fn = () => undefined; Promise.${method}([1, fn.bind()]);`,
    },
    {
      code: `const fn = () => undefined; Promise.${method}([1, fn.apply()]);`,
    },
    // Safe-ish builders
    {
      code: `Promise.${method}([1, knex('schema.table').delete()])`,
    },
    {
      code: `Promise.${method}([1, knex('schema.table').select('*').where('id', 1)])`,
    },
    {
      code: `Promise.${method}([1, knex.delete().from('schema.table')])`,
    },
    // Safe Promise wrappers
    {
      code: `
        const createFail = () => () => fail();
        Promise.${method}([,Promise.try(createFail())]);
      `,
    },
    { code: `Promise.${method}([,Promise.try(() => fail())])` },
    { code: `Promise.${method}([,Promise.resolve().then(() => fail())])` },
    {
      code: `Promise.${method}([,Promise.resolve().then(() => fail(), 2, 3, 4)])`,
    },
    // Identifier in arguments
    {
      code: `
        const iterable = fail();
        const fn = async (args: unknown[]) => undefined;
          Promise.${method}([, fn(iterable)])
        `,
    },
    {
      code: `
        const iterable = fail();
        const fn = async (...args: unknown[]) => undefined;
          Promise.${method}([, fn(...iterable)])
        `,
    },
  ]),
  invalid: methods.flatMap((method) => [
    {
      code: `
        const syncFn = () => fail();
        Promise.${method}([1, 2, Boolean() ? syncFn() : Promise.resolve()]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'Boolean() ? syncFn() : Promise.resolve()',
            underlying: 'fail()',
            line: 2,
            column: 29,
          },
        },
      ],
    },
    {
      code: `Promise.${method}([1, fail(), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
    {
      code: `
        const path = { to: { syncFn: () => fail() } };
        Promise.${method}([1, path.to?.syncFn(), 3]);
      `,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'path.to?.syncFn()' },
        },
      ],
    },
    {
      code: `Promise.${method}([1, Namespace.method(), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'Namespace.method()' },
        },
      ],
    },
    {
      code: `
        Promise.${method}([
          1,
          Promise.resolve(syncFn()),
          3,
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'Promise.resolve(syncFn())',
            underlying: 'syncFn()',
            line: 4,
            column: 26,
          },
        },
      ],
    },
    {
      code: `
        const promises = [1, syncFn(), 3];
        Promise.${method}(promises);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'promises',
            underlying: 'syncFn()',
            line: 2,
            column: 29,
          },
        },
      ],
    },
    {
      code: `
        const syncFn = () => fail();
        const p1 = [1, syncFn(), 3];
        const p2 = p1;
        const p3 = p2;
        Promise.${method}(p3);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'p3',
            underlying: 'fail()',
            line: 2,
            column: 29,
          },
        },
      ],
    },
    // New expressions (constructors)
    {
      code: `Promise.${method}([1, new Promise(resolve => resolve(2))])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'new Promise(resolve => resolve(2))' },
        },
      ],
    },
    {
      code: `Promise.${method}([1, new Set(xs.map(() => {})), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'xs.map(() => {})' },
        },
      ],
    },
    // Nested arrays
    {
      code: `
        Promise.${method}([
          1,
          [syncFn(), 2],
          3,
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: '[syncFn(), 2]',
            underlying: 'syncFn()',
            line: 4,
            column: 11,
          },
        },
      ],
    },
    // Complex nested function calls
    {
      code: `Promise.${method}([1, nested.deeply.func(), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'nested.deeply.func()' },
        },
      ],
    },
    // Chained method calls
    {
      code: `Promise.${method}([1, str.trim().toLowerCase(), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'str.trim().toLowerCase()' },
        },
      ],
    },
    // Variable resolution with multiple levels
    {
      code: `
        const level1 = [1, syncFn(), 3];
        const level2 = level1;
        const level3 = level2;
        const level4 = level3;
        Promise.${method}(level4);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'level4',
            underlying: 'syncFn()',
            line: 2,
            column: 27,
          },
        },
      ],
    },
    // Spread with problematic elements
    {
      code: `
        const problematic = [1, syncFn(), 3];
        Promise.${method}(...problematic);
      `,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
        },
      ],
    },
    {
      code: `
        const problematic = [1, syncFn(), 3];
        Promise.${method}([0, ...problematic, 4]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: '...problematic',
            underlying: 'syncFn()',
            line: 2,
            column: 32,
          },
        },
      ],
    },
    // Template literal with expression
    {
      code: `
        Promise.${method}([
          1,
          \`result: \${syncFn()}\`,
          3
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: '`result: ${syncFn()}`',
            underlying: 'syncFn()',
            line: 4,
            column: 21,
          },
        },
      ],
    },
    // Array instance method
    {
      code: `
        const set = new Set([1, 2, 3]);
        Promise.${method}(
          set.entries().map(() => fail()),
        );
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'set.entries().map(() => fail())',
            underlying: 'fail()',
            line: 4,
            column: 34,
          },
        },
      ],
    },
    {
      code: `
        const fn = (xs: string[]) => Promise.${method}(
          xs.map(() => fail()),
        );
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'xs.map(() => fail())',
            underlying: 'fail()',
            line: 3,
            column: 23,
          },
        },
      ],
    },
    // IIFE
    {
      code: `
        Promise.${method}([
          1,
          (() => fail())(),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: '(() => fail())()',
            underlying: 'fail()',
            line: 4,
            column: 17,
          },
        },
      ],
    },
    // Simple function expression with blocky argument
    {
      code: `
        const xs = [1, 2, 3];
        const fn = (x: number) => x * 2;
        const param = (x: number) => { /* block! */ return x }
        Promise.${method}([1, xs.map(() => fn(param(x))), 3]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'xs.map(() => fn(param(x)))',
            underlying: 'param = (x: number) => { /* block! */ return x }',
            line: 4,
            column: 14,
          },
        },
      ],
    },
    // Object/function instance method with problematic argument
    {
      code: `
        Promise.${method}([
          1,
          [1, 2].map(x => x.toLocaleString(fail())),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: '[1, 2].map(x => x.toLocaleString(fail()))',
            underlying: 'fail()',
            line: 4,
            column: 43,
          },
        },
      ],
    },
    {
      code: `
        const fn = () => undefined;
        Promise.${method}([
          1,
          fn.call(fail()),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'fn.call(fail())',
            underlying: 'fail()',
            line: 5,
            column: 18,
          },
        },
      ],
    },
    // Safe Promise wrappers with unsafe arguments
    {
      code: `
        Promise.${method}([
          ,
          Promise.try(fail()),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'Promise.try(fail())',
            underlying: 'fail()',
            line: 4,
            column: 22,
          },
        },
      ],
    },
    {
      code: `
        Promise.${method}([
          ,
          Promise.try(() => fail(), 2, 3, fail()),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'Promise.try(() => fail(), 2, 3, fail())',
            underlying: 'fail()',
            line: 4,
            column: 42,
          },
        },
      ],
    },
    {
      code: `
        Promise.${method}([
          ,
          Promise.resolve().then(fail()),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'Promise.resolve().then(fail())',
            underlying: 'fail()',
            line: 4,
            column: 33,
          },
        },
      ],
    },
  ]),
});
