---
'skuba': minor
---

build: Default esbuild output format to CJS

`skuba build` now defaults to CJS format when using esbuild configuration. It will only output in ESM when both `"type": "module"` is set in `package.json` and the `module` field in `tsconfig.json` is not set to `commonjs`.
