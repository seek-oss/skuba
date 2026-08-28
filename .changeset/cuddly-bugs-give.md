---
'skuba': minor
---

lint: Replace Prettier with Oxfmt

`skuba lint` and `skuba format` now use Oxfmt instead of Prettier. Benchmarks show Oxfmt to be up to 30x faster.

Oxfmt may format some code differently from Prettier, so you may see diffs in existing files.

`oxfmt` and `oxc-config-seek` are now hoisted in place of `prettier`.
