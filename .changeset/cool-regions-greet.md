---
'skuba': minor
---

build: Default esbuild output to CJS format

**Note:** This only affects projects that have manually set `package.json#/skuba/build` to `"esbuild"`. There are [less than 10 of these](https://github.com/search?q=skuba+%2F%22build%22%3A+%22esbuild%22%2F+language%3AJSON+NOT+is%3Aarchived+NOT+is%3Afork&type=code) at time of writing.

`skuba build` now defaults to CJS output when using the esbuild configuration. ESM output is only used when the following conditions are met:

- `"type": "module"` is set in `package.json`
- The `module` field in `tsconfig.json` is not set to `"commonjs"`
