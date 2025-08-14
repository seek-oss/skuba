---
'eslint-plugin-skuba': patch
'eslint-config-skuba': patch
---

skuba/no-sync-in-promise-iterable: Exempt more scenarios

- Files in a `/testing/` subdirectory or named `.test.ts`

- Global object constructors like `new Map()` and `new Set()` (`new Promise(executor)` has been reclassified as unsafe)

- Knex builders like `knex.builder().method()`

- Nested spread identifiers like `fn(...iterable)`
