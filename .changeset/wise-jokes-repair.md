---
"skuba": patch
---

node, start: Print function entrypoint parameters

When running a function entrypoint, `skuba node` and `skuba start` now print the function and parameter names as a usage hint:

```javascript
yarn skuba node 'src/api/buildkite/annotate.ts#annotate'
// annotate (markdown, opts)
// listening on port 9001

curl --data '["_Hello there_", {}]' --include localhost:9001
```
