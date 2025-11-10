---
'skuba': patch
---

lint: Check curried functions in `skuba/no-sync-in-promise-iterable`

This looks for synchronous calls in expressions like `fn()()()`.
