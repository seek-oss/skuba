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
    {
      code: `Promise.${method}([1, new Promise(resolve => resolve(2)), 3])`,
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
  ]),
  invalid: methods.flatMap((method) => [
    {
      code: `
        const syncFn = () => fail();
        Promise.${method}([1, 2, Boolean() ? syncFn() : Promise.resolve()]);
      `,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
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
      code: `Promise.${method}([1, Promise.resolve(syncFn()), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
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
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
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
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
    // New expressions (constructors)
    {
      code: `Promise.${method}([1, new Error("test"), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'new Error("test")' },
        },
      ],
    },
    {
      code: `Promise.${method}([1, new Map(), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'new Map()' },
        },
      ],
    },
    // Nested arrays
    {
      code: `Promise.${method}([1, [syncFn(), 2], 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
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
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
        },
      ],
    },
    // Spread with problematic elements
    {
      code: `
        const problematic = [1, syncFn(), 3];
        Promise.${method}([0, ...problematic, 4]);
      `,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
        },
      ],
    },
    // Template literal with expression
    {
      code: `Promise.${method}([1, \`result: \${syncFn()}\`, 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'syncFn()' },
        },
      ],
    },
    // Array instance method
    {
      code: `
        const set = new Set([1, 2, 3]);
        Promise.${method}(set.entries().map(() => fail()));
      `,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
    {
      code: `const fn = (xs: string[]) => Promise.${method}(xs.map(() => fail()))`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
    // IIFE
    {
      code: `Promise.${method}([1, (() => fail())()]);`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
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
          messageId: 'mayThrowSyncError',
          data: {
            method,
            value: 'param = (x: number) => { /* block! */ return x }',
          },
        },
      ],
    },
    // Object/function instance method with problematic argument
    {
      code: `Promise.${method}([1, [1, 2].map(x => x.toLocaleString(fail()))]);`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
    {
      code: `const fn = () => undefined; Promise.${method}([1, fn.call(fail())]);`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: { method, value: 'fail()' },
        },
      ],
    },
  ]),
});
