---
'skuba': minor
---

build: Update esbuild build format logic

`skuba build` in `esbuild` configuration will output in `cjs` format unless the `type` field in the consumer's `package.json` is set to `module`.
