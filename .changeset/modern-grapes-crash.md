---
'skuba': patch
---

**node, start:** Propagate `process.argv`

Passing command-line arguments into a script now works as expected:

```bash
yarn skuba node src/script.ts arg1 arg2 arg3
```
