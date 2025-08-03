---
parent: ESLint plugin
---

# no-sync-in-promise-iterable

```json5
{
  'skuba/no-sync-in-promise-iterable': 'warn',
}
```

Heuristically flags synchronous logic in the iterable argument of [static `Promise` methods] that could leave preceding promises dangling.

```typescript
const [x, y] = await Promise.allSettled([asyncX(), syncY()]);
//                                                 ~~~~~~~
// syncY() may synchronously throw an error and leave preceding promises dangling.
// Evaluate synchronous expressions before constructing the iterable argument to Promise.allSettled.
// Use the async keyword to denote asynchronous functions.
```

## Problem

In the above example,
if both `asyncX()` and `syncY()` throw errors,
the former will result in an unhandled promise rejection.
By default, this will cause the Node.js process to exit (!).

The resilience of back-end applications can be improved by changing the [`--unhandled-rejections` CLI mode] or adding a [`process.on('unhandledRejection')` event handler] to avoid this terminal state.
Addressing the underlying issue is still useful to avoid dispatching unnecessary promises which may degrade performance or trigger unanticipated partial failure states.

If the above example felt contrived,
consider that the issue is not limited to synchronous functions that are directly passed as an iterable element to a static `Promise` method.
You may have an argument or condition that implicates synchronous evaluation:

```typescript
const [x, y] = await Promise.all([
  asyncX(),
  condition
    ? asyncY()
    : // May throw a synchronous error
      syncFallback(),
]);
```

```typescript
const [x, y] = await Promise.all([
  asyncX(),
  asyncY(
    // May throw a synchronous error
    syncParam(),
  ),
]);
```

This rule targets static `Promise` methods as typical callsites where the issue crops up.
However, the underlying cause is more fundamentally about [asynchronous programming in JavaScript] and order of evaluation.
For example, you could equally construct the following:

```typescript
const [promiseX, y] = [
  asyncX(), // Queues up work to throws an error
  syncY(), // Immediately throws an error
];

const x = await promiseX; // Never reached, so `promiseX` rejection is unhandled
```

The above can be expanded to the following:

```typescript
const first = asyncX(); // Queues up work to throws an error
const second = syncY(); // Immediately throws an error

const [promiseX, y] = [first, second];

const x = await promiseX; // Never reached, so `promiseX` rejection is unhandled
```

This is an issue for non-head elements in the iterable.
Array elements are evaluated in the order they are specified,
so an error thrown during evaluation of the head element will not leave preceding promises dangling.

```typescript
const [y, promiseX] = [
  syncY(), // It's okay to throw before we make any promises
  asyncX(), // Never reached, so no promise is left dangling
];

const x = await promiseX;
```

## Fix

Avoid invoking synchronous logic between an async function being dispatched (`asyncX()`) and its promise being handled (by a static `Promise` method, `await`, etc).

```diff
+ const param = syncParam(); // It's okay to throw before we make any promises

  await Promise.all([
    asyncX(),
-   asyncY(syncParam()),
+   asyncY(param),
  ]);
```

Use the `async` keyword to denote asynchronous functions for safety;
see the [relevant section](#asynchronous-functions) below for more information.

```diff
- const asyncX = () => {
+ const asyncX = async () => {
    // ...
  };

  await Promise.all([asyncX(), asyncX()]);
```

## Limitations

This rule requires type checking and is heuristical.
It may exit early without reporting issues in scenarios it has not accounted for.

Treat it as a helper to reduce the number of async issues in your codebase,
not as a guarantee to flag all problematic occurrences.

### Synchronous functions

TypeScript's type system does not capture error handling,
so this rule assumes that a given `syncY()` function _may_ throw and should be evaluated before constructing the iterable argument.

```typescript
// Never throws, but is still flagged
const syncParam = () => undefined;

const [x, y] = await Promise.all([asyncX(), asyncY(syncParam())]);
//                                                 ~~~~~~~~~~~
// syncParam() may synchronously throw an error and leave preceding promises dangling.
// Evaluate synchronous expressions before constructing the iterable argument to Promise.all.
// Use the async keyword to denote asynchronous functions.
```

We recommend restructuring your code regardless to avoid this class of issue;
consider that you may change the implementation of `syncY()` to throw an error in future.

### Asynchronous functions

TypeScript's type system does not capture error handling,
so this rule cannot exhaustively prove whether a [thenable] `asyncX()` function still throws synchronous errors.

The following example demonstrates the issue:

```typescript
const evil = (() => {
  if (condition) {
    throw new Error('Synchronous error'); // Throws synchronous error
  }

  return Promise.resolve();
}) satisfies () => Promise<void>; // While appearing asynchronous
```

Use of the `async` keyword can help to ensure the whole function evaluation is deferred,
and can be enforced with the [`@typescript-eslint/promise-function-async`] rule.
It comes with performance implications,
but you are unlikely to need to micro-optimise to this degree.

```typescript
const good = (async () => {
  if (something) {
    throw new Error('Asynchronous error');
  }

  return;
}) satisfies () => Promise<void>;
```

Other options like [`Promise.try()`] may be explored in future.

### Getters and setters

TypeScript's type system does not capture error handling,
so this rule assumes that property access and assignment is safe.

The assumption is not strictly correct.
Custom [`get`]ters and [`set`]ters can throw errors:

```typescript
const obj = {
  get prop() {
    throw new Error('Badness!');
  },
};

obj.prop;
// Uncaught Error: Badness!
```

The [`no-restricted-syntax`] rule can flag custom getters and setters:

```javascript
module.exports = [
  rules: {

  'no-restricted-syntax': [
    ERROR,
    {
      selector: 'MethodDefinition[kind = "get"]',
      message:
        'Custom getters can cause confusion, particularly if they throw errors. Remove the `get` syntax to specify a regular method instead.',
    },
    {
      selector: 'MethodDefinition[kind = "set"]',
      message:
        'Custom setters can cause confusion, particularly if they throw errors. Remove the `set` syntax to specify a regular method instead.',
    },
    {
      selector: 'Property[kind = "get"]',
      message:
        'Custom getters can cause confusion, particularly if they throw errors. Remove the `get` syntax to specify a regular property instead.',
    },
    {
      selector: 'Property[kind = "set"]',
      message:
        'Custom setters can cause confusion, particularly if they throw errors. Remove the `set` syntax to specify a regular property instead.',
    },],
  }
];
```

This configuration is baked in to [`eslint-config-seek`] and [`eslint-config-skuba`].

[`--unhandled-rejections` CLI mode]: https://nodejs.org/api/cli.html#--unhandled-rejectionsmode
[`@typescript-eslint/promise-function-async`]: https://typescript-eslint.io/rules/promise-function-async/
[`eslint-config-seek`]: https://github.com/seek-oss/eslint-config-seek
[`eslint-config-skuba`]: https://github.com/seek-oss/skuba/main/packages/eslint-config-skuba
[`get`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
[`no-restricted-syntax`]: https://eslint.org/docs/latest/rules/no-restricted-syntax
[`process.on('unhandledRejection')` event handler]: https://nodejs.org/api/process.html#event-unhandledrejection
[`Promise.try()`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/try
[`set`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
[asynchronous programming in JavaScript]: https://nodejs.org/en/learn/asynchronous-work/asynchronous-flow-control
[static `Promise` methods]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods
[thenable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables
