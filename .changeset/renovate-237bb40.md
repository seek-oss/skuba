---
'skuba': minor
'@skuba-lib/detect-invalid-spies': minor
---

deps: typescript ~6.0.0

This major release contains breaking changes. See the [TypeScript 6.0.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) announcement for more information.

If your tsconfig currently extends `skuba/config/tsconfig.json`, you may not need to update anything. However, if you have a custom configuration or run into lint errors related to missing Vitest globals, you may need to manually add `node` and `vitest/globals` to the `types` array in your tsconfig:

```diff
{
  "compilerOptions": {
+   "types": ["node", "vitest/globals"]
  }
}
```
