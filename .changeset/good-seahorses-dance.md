---
"skuba": patch
---

node, start: Handle void function inputs and outputs

When running a function entrypoint, `skuba node` and `skuba start` now handle an omitted request body the same as an empty JSON array of arguments `[]`. The function can also return `undefined` to omit a response body.
