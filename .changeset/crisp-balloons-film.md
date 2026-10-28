---
'@skuba-lib/api': minor
---

api: Add `Cdk.ensureAssetPlaceholders`

This function creates placeholder Lambda asset directories when they do not already exist, allowing CDK stack tests to synthesise without first building the real bundles.

```typescript
beforeAll(() => {
  Cdk.ensureAssetPlaceholders(['dist/worker'], {
    cwd: path.join(import.meta.dirname, '..'),
  });
});
```
