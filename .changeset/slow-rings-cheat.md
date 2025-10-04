---
'skuba': minor
---

build: Forward custom conditions to esbuild

**Note:** This only affects projects that have manually set `package.json#/skuba/build` to `"esbuild"`. There are [less than 10 of these](https://github.com/search?q=skuba+%2F%22build%22%3A+%22esbuild%22%2F+language%3AJSON+NOT+is%3Aarchived+NOT+is%3Afork&type=code) at time of writing.

When using esbuild as the bundler, any custom conditions specified in `tsconfig.json` will now be forwarded to esbuild via the `conditions` option.
