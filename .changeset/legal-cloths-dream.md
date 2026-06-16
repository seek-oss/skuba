---
'skuba': patch
---

template/greeter: Use `repoName` for templating

This fixes the following warning upon `skuba init`:

```typescript
Failed to render my-repo/vitest.config.ts
ReferenceError: ejs:8
    6|     ssr: {
    7|       resolve: {
 >> 8|         conditions: ['@seek/<%- serviceName %>/source'],
    9|       },
    10|     },
    11|     test: {

serviceName is not defined
```
