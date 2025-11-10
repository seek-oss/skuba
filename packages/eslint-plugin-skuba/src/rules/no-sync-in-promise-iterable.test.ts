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
    {
      code: `Promise.${method}([1, new Promise(() => { throw new Error('') })])`,
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
      code: `Promise.${method}([1, Array.from('foo'), 3])`,
    },
    {
      code: `Promise.${method}([1, Array.fromAsync('foo', async () => { throw new Error() }), 3])`,
    },
    {
      code: `Promise.${method}([1, Array.fromAsync('foo', () => { throw new Error() }), 3])`,
    },
    {
      code: `Promise.${method}([1, Array.isArray(value), 3])`,
    },
    {
      code: `Promise.${method}([1, Array.of('foo', 0, false), 3])`,
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
    // Safe curried functions (no sync errors)
    {
      code: `
        const curriedFn = (x: string) => async (item: any) => item;
        Promise.${method}([, items.map((item) => curriedFn('safe')(item))]);
      `,
    },
    {
      code: `
        const triple = (a: string) => (b: string) => async (item: any) => item;
        Promise.${method}([, items.map((item) => triple('a')('b')(item))]);
      `,
    },
    {
      code: `
        const obj = { fn: (x: string) => async (item: any) => item };
        Promise.${method}([, items.map((item) => obj.fn('safe')(item))]);
      `,
    },
    // Chained promises with safe curried functions
    {
      code: `Promise.${method}([, Promise.resolve('safe').then((x) => curried(x)(item))])`,
    },
    {
      code: `Promise.${method}([, Promise.resolve().then(() => curried('safe')(item))])`,
    },
    // Regular call expressions with safe curried functions
    {
      code: `
        const getPromise = (x: string) => async (item: any) => item;
        Promise.${method}([, getPromise('safe')(item)]);
      `,
    },

    // Member expressions with safe object
    {
      code: `
        const obj = () => ({ prop: 123 });
        Promise.${method}([, obj().prop, 3]);
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
      code: `
        Promise.${method}([
          1,
          new Set(xs.map(() => {})),
          3,
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'new Set(xs.map(() => {}))',
            underlying: 'xs.map(() => {})',
            line: 4,
            column: 18,
          },
        },
      ],
    },
    // Safe-ish Array functions with unsafe arguments
    {
      code: `Promise.${method}([1, Array.from('foo', () => { throw new Error() }), 3])`,
      errors: [
        {
          messageId: 'mayThrowSyncError',
          data: {
            method,
            value: "Array.from('foo', () => { throw new Error() })",
          },
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
    // Curried functions - base case
    {
      code: `
        const curriedFn = (x: string) => async (item: any) => item;
        Promise.${method}([, items.map((item) => curriedFn(fail())(item))]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'items.map((item) => curriedFn(fail())(item))',
            underlying: 'fail()',
            line: 3,
            // Column varies because method name is on the same line as fail()
            column: { all: 53, allSettled: 60, any: 53, race: 54 }[method],
          },
        },
      ],
    },
    // Curried functions - triple currying
    {
      code: `
        const triple = (a: string) => (b: string) => async (item: any) => item;
        Promise.${method}([, items.map((item) => triple(fail())('b')(item))]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: "items.map((item) => triple(fail())('b')(item))",
            underlying: 'fail()',
            line: 3,
            column: { all: 50, allSettled: 57, any: 50, race: 51 }[method],
          },
        },
      ],
    },
    // Curried functions - member expression
    {
      code: `
        const obj = { fn: (x: string) => async (item: any) => item };
        Promise.${method}([, items.map((item) => obj.fn(fail())(item))]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'items.map((item) => obj.fn(fail())(item))',
            underlying: 'fail()',
            line: 3,
            column: { all: 50, allSettled: 57, any: 50, race: 51 }[method],
          },
        },
      ],
    },
    // Curried functions - error in middle of chain
    {
      code: `
        const triple = (a: string) => (b: string) => async (item: any) => item;
        Promise.${method}([, items.map((item) => triple('a')(fail())(item))]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: "items.map((item) => triple('a')(fail())(item))",
            underlying: 'fail()',
            line: 3,
            column: { all: 55, allSettled: 62, any: 55, race: 56 }[method],
          },
        },
      ],
    },
    // Regular call expressions with curried functions (tests fallback branch)
    {
      code: `
        const getPromise = (x: string) => async (item: any) => item;
        Promise.${method}([, getPromise(fail())(item)]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'getPromise(fail())(item)',
            underlying: 'fail()',
            line: 3,
            column: { all: 34, allSettled: 41, any: 34, race: 35 }[method],
          },
        },
      ],
    },
    {
      code: `
        Promise.${method}([
          ,
          someFunction(fail())('arg'),
        ]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: "someFunction(fail())('arg')",
            underlying: 'fail()',
            line: 4,
            column: { all: 23, allSettled: 23, any: 23, race: 23 }[method],
          },
        },
      ],
    },
    // Member expressions with unsafe object
    {
      code: `
        const obj = () => { return { prop: 123 }; };
        Promise.${method}([, obj().prop, 3]);
      `,
      errors: [
        {
          messageId: 'mayLeadToSyncError',
          data: {
            method,
            value: 'obj().prop',
            underlying: 'obj = () => { return { prop: 123 }; }',
            line: 2,
            column: 14,
          },
        },
      ],
    },
  ]),
});
