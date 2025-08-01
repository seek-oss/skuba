---
'eslint-config-skuba': minor
'eslint-plugin-skuba': major
'skuba': minor
---

lint: Add `skuba/no-sync-in-promise-iterable` rule

[`skuba/no-sync-in-promise-iterable`](https://seek-oss.github.io/skuba/docs/eslint-plugin/no-sync-in-promise-iterable.html) heuristically flags synchronous logic in the iterable argument of [static `Promise` methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods) that could leave preceding promises dangling.

```typescript
await Promise.allSettled([
  promiseReject() /* This will result in an unhandled rejection */,
  promiseResolve(syncFn() /* If this throws an error synchronously  */),
  //             ~~~~~~~~
  // syncFn() may synchronously throw an error and leave preceding promises dangling.
  // Evaluate synchronous expressions before constructing the iterable argument to Promise.allSettled.
]);
```

A [Promise](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs) that is not awaited and later moves to a rejected state is referred to as an unhandled rejection. When an unhandled rejection is encountered, a Node.js application that does not use process clustering will default to crashing out.

This new rule defaults to the [`warn` severity](https://eslint.org/docs/latest/use/configure/rules#rule-severities) while we monitor feedback. Please share examples of false positives if you regularly run into them.
