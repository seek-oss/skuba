---
'skuba': minor
---

build, build-package: Add a skuba config key named `assets` to copy assets to the output directory.

In your `package.json`:

```diff
 {
   "skuba": {
+    "assets": [
+      "**/*.vocab/*translations.json"
+    ],
     "entryPoint": "src/index.ts",
     "type": "package",
   }
 }
```

This will instruct skuba to copy the files matching the list of globs to the output directory/ies, preserving the directory structure from the source:

- for `skuba build-package` it will copy them to `lib-commonjs` and `lib-es2015`
- for `skuba build` it will copy them to `tsconfig.json#/compilerOptions.outDir` (`lib` by default)
