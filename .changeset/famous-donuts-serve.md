---
'eslint-config-skuba': minor
---

deps: typescript-eslint ^8.12.1

This fixes a performance regression in `@typescript-eslint/no-unsafe-return` with high-cardinality unions. See the [issue](https://github.com/typescript-eslint/typescript-eslint/issues/10196) for more information.
