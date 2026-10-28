---
'skuba': patch
---

template: Set `ENVIRONMENT: 'test'` in `vitest.config.ts`

This lets your code tell when it is running under test. For example, `Rolldown.lambdaAsset` checks it to emit a stub asset, so CDK stack tests can synthesise `Code.fromAsset` without building the real bundles first.

Existing projects can opt in by adding it to their own config:

```typescript
// vitest.config.ts
export default defineConfig(
  Vitest.mergePreset({
    test: {
      env: {
        ENVIRONMENT: 'test',
      },
    },
  }),
);
```
