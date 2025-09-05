# eslint-plugin-skuba

## 1.0.1

### Patch Changes

- **skuba/no-sync-in-promise-iterable:** Exempt more scenarios ([#2024](https://github.com/seek-oss/skuba/pull/2024))
  - Files in a `/testing/` subdirectory or named `.test.ts`
  - Global object constructors like `new Map()` and `new Set()` (`new Promise(executor)` has been reclassified as unsafe)
  - Knex builders like `knex.builder().method()`
  - Nested spread identifiers like `fn(...iterable)`

- **skuba/no-sync-in-promise-iterable:** Improve warning location ([#2029](https://github.com/seek-oss/skuba/pull/2029))

  Previously, each warning was anchored to the underlying expression that may have thrown a synchronous error, which could be confusing to triage. The rule now emits each warning against the root argument to the static `Promise` method, and includes details about the underlying expression in its message.

## 1.0.0

### Major Changes

- **lint:** Add `skuba/no-sync-in-promise-iterable` rule ([#1969](https://github.com/seek-oss/skuba/pull/1969))

  [`skuba/no-sync-in-promise-iterable`](https://seek-oss.github.io/skuba/docs/eslint-plugin/no-sync-in-promise-iterable.html) heuristically flags synchronous logic in the iterable argument of [static `Promise` methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods) that could leave preceding promises dangling.

  ```typescript
  await Promise.allSettled([
    promiseReject() /* This will result in an unhandled rejection */,
    promiseResolve(syncFn() /* If this throws an error synchronously  */),
    //             ~~~~~~~~
    // syncFn() may synchronously throw an error and leave preceding promises dangling.
    // Evaluate synchronous expressions outside of the iterable argument to Promise.allSettled,
    // or safely wrap with the async keyword, Promise.try(), or Promise.resolve().then().
  ]);
  ```

  A [Promise](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs) that is not awaited and later moves to a rejected state is referred to as an unhandled rejection. When an unhandled rejection is encountered, a Node.js application that does not use process clustering will default to crashing out.

  This new rule defaults to the [`warn` severity](https://eslint.org/docs/latest/use/configure/rules#rule-severities) while we monitor feedback. Please share examples of false positives if you regularly run into them.
