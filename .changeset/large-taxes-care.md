---
'skuba': minor
---

build: Add experimental rolldown build support

skuba now supports [rolldown](https://rolldown.rs/) as a build mode. You can opt in by setting `"build": "rolldown"` in your `skuba` config in `package.json`, which will invoke rolldown using a config file:

```diff
{
  "skuba": {
-   "build": "esbuild",
+   "build": "rolldown",
    "template": "koa-rest-api",
    "type": "application"
  }
}
```

See the [rolldown documentation](https://rolldown.rs/guide/getting-started#using-the-config-file) for details on configuring rolldown via a config file.

Example config file (`rolldown.config.mjs`):

```ts
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/listen.ts',
  platform: 'node',
  external: [/^dd-trace/],
  resolve: {
    conditionNames: ['@seek/my-repo/source'],
  },
  output: {
    format: 'esm',
    sourcemap: true,
  },
});
```
