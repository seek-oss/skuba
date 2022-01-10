---
"skuba": patch
---

test: Restore Node.js 12 compatibility

This resolves the following error in Node.js 12 environments:

```typescript
Object.entries(parsedConfig.options.paths ?? DEFAULT_PATHS).flatMap(
                                                 ^

SyntaxError: Unexpected token '?'
```

Note that Node.js 12 will reach its end of life in May 2022.
