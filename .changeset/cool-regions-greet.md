---
'skuba': minor
---

build: Default esbuild output to CJS format

**Note:** This only applies when `package.json#/skuba/build` is set to `"esbuild"`.

`skuba build` now defaults to CJS output when using the esbuild configuration. ESM output is only used when the following conditions are met:

- `"type": "module"` is set in `package.json`
- The `module` field in `tsconfig.json` is not set to `"commonjs"`
