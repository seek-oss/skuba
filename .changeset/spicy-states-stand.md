---
'eslint-config-skuba': minor
---

lint: Ignore generated `*.vocab/index.ts` files

Vocab `index.ts` files are generated and are not meant to be linted. `eslint-config-skuba` now ignores `**/*.vocab/index.ts`.
