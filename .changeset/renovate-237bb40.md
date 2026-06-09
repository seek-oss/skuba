---
'skuba': minor
'@skuba-lib/detect-invalid-spies': minor
---

deps: typescript ~6.0.0

This major release contains breaking changes. See the [TypeScript 6.0.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) announcement for more information.

If your tsconfig currently extends `skuba/config/tsconfig.json`, you may not need to update anything. However, if you have a custom configuration, you may need to manually add `node` to the `types` array.

```diff
{
  "compilerOptions": {
+   "types": ["node"]
  }
}
```
