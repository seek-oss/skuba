---
'skuba': patch
---

template/lambda-sqs-worker: Avoid mutation of logger context

We now perform a shallow copy when retrieving the logger context from `AsyncLocalStorage`.

```diff
- mixin: () => loggerContext.getStore() ?? {},
+ mixin: () => ({ ...loggerContext.getStore() }),
```
