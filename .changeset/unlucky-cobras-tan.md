---
'skuba': minor
---

build: Add experimental esbuild support

You can now build your project with [esbuild](https://esbuild.github.io/). Note that this integration is still experimental, only includes the bare minimum to supplant a basic `tsc`-based build, and is not guaranteed to match `tsc` output. See the [esbuild deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esbuild.html) for more information.

To opt in, modify your `package.json`:

```diff
{
  "skuba": {
+   "build": "esbuild",
    "template": null
  }
}
```
