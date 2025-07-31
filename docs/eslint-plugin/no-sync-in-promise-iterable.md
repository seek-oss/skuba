---
parent: ESLint plugin
---

# no-sync-in-promise-iterable

Heuristically flags synchronous logic in the iterable argument of [static `Promise` methods] that could leave preceding promises dangling.

```typescript
const [x, y] = await Promise.allSettled([asyncX(), syncY()]);
//                                                 ~~~~~~~
// syncY() may synchronously throw an error and leave preceding promises dangling.
// Evaluate synchronous expressions before constructing the iterable argument to Promise.allSettled.
```

## Problem

In the above example,
if both `asyncX()` and `syncY()` throw errors,
the former will result in an unhandled promise rejection.
By default, this will cause the Node.js process to exit (!).

The resilience of back-end applications can be improved by changing the [`--unhandled-rejections` CLI mode] or adding a [`process.on('unhandledRejections')` event handler] to avoid this terminal state.
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

```typescript
const param = syncParam(); // It's okay to throw before we make any promises

await Promise.all([asyncX(), asyncY(param)]);
```

## Limitations

This rule requires type checking.

### False positives

TypeScript's type system does not capture error handling,
so this rule assumes that a given `syncY()` function _may_ throw.

We recommend restructuring your code regardless to avoid this class of issue in future.

### Synchronous errors from asynchronous functions

TypeScript's type system does not capture error handling,
so this rule assumes that a given `asyncX()` function with a [thenable] return type will only throw asynchronous errors.

The assumption is not strictly correct. Consider the following:

```typescript
const evil = (() => {
  if (condition) {
    throw new Error('Synchronous error');
  }

  return Promise.resolve();
}) satisfies () => Promise<void>;
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

[`--unhandled-rejections` CLI mode]: https://nodejs.org/api/cli.html#--unhandled-rejectionsmode
[`@typescript-eslint/promise-function-async`]: https://typescript-eslint.io/rules/promise-function-async/
[`process.on('unhandledRejections')` event handler]: https://nodejs.org/api/process.html#event-unhandledrejection
[`Promise.try()`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/try
[asynchronous programming in JavaScript]: https://nodejs.org/en/learn/asynchronous-work/asynchronous-flow-control
[static `Promise` methods]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods
[thenable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables
