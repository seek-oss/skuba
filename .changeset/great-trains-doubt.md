---
'skuba': patch
---

deps: Prettier 3.2

A notable change in this release is the application of trailing newlines to JSONC files, including `tsconfig.json`:

```diff
{
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "lib",
-   "target": "ES2022"
+   "target": "ES2022",
  },
  "exclude": ["lib*/**/*"],
- "extends": "skuba/config/tsconfig.json"
+ "extends": "skuba/config/tsconfig.json",
}
```

See the [release notes](https://prettier.io/blog/2024/01/12/3.2.0) for more information.
