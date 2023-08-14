---
'skuba': minor
---

deps: eslint-config-skuba 3

This major upgrade brings in new rules from [typescript-eslint v6](https://typescript-eslint.io/blog/announcing-typescript-eslint-v6/).

Diff patch from eslint-config-skuba 2 and eslint-config-skuba 3

```diff
{
+  '@typescript-eslint/array-type': '...',
+  '@typescript-eslint/ban-tslint-comment': '...',
+  '@typescript-eslint/class-literal-property-style': '...',
+  '@typescript-eslint/consistent-generic-constructors': '...',
+  '@typescript-eslint/consistent-indexed-object-style': '...',
+  '@typescript-eslint/consistent-type-assertions': '...',
+  '@typescript-eslint/consistent-type-definitions': '...',
+  'dot-notation': '...',
+  '@typescript-eslint/dot-notation': '...',
+  '@typescript-eslint/no-base-to-string': '...',
+  '@typescript-eslint/no-confusing-non-null-assertion': '...',
+  '@typescript-eslint/no-duplicate-enum-values': '...',
+  '@typescript-eslint/no-duplicate-type-constituents': '...',
+  '@typescript-eslint/no-redundant-type-constituents': '...',
+  '@typescript-eslint/no-unsafe-declaration-merging': '...',
+  '@typescript-eslint/no-unsafe-enum-comparison': '...',
+  '@typescript-eslint/prefer-for-of': '...',
+  '@typescript-eslint/prefer-function-type': '...',
+  '@typescript-eslint/prefer-nullish-coalescing': '...',
+  '@typescript-eslint/prefer-optional-chain': '...',
+  '@typescript-eslint/prefer-string-starts-ends-with': '...',
-  'no-extra-semi': '...',
-  '@typescript-eslint/no-extra-semi': '...',
}
```
