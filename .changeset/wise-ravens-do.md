---
"skuba": patch
---

node: Register `tsconfig-paths` in REPL

This resolves the following error:

```typescript
Error: Cannot find module '/node_modules/skuba/lib/register'
Require stack:
- internal/preload
```
