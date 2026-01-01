---
'skuba': minor
---

build: Add esbuild bundling support

You can now optionally enable esbuild bundling when using the experimental `esbuild` build mode. This allows you to bundle your output and, when bundling is enabled, also opt into minification, code splitting (ESM + `outDir` required), and tree shaking. You can also mark certain dependencies as external to keep them out of the bundle.

To opt in, configure `esbuildConfig` in your `package.json`:

```diff
{
  "skuba": {
    "build": "esbuild",
+   "esbuildConfig": {
+     "bundle": true,
+     "minify": true,
+     "splitting": false,
+     "treeShaking": true,
+     "external": ["aws-sdk"]
+   },
  "template": "koa-rest-api",
  "type": "application",
  }
}
```
