---
'eslint-plugin-skuba': patch
'eslint-config-skuba': patch
---

skuba/no-sync-in-promise-iterable: Reduce noise

- Rule has been disabled on test files (in a `/testing/` subdirectory or named `.test.ts`)

- Global object constructors like `new Map()` and `new Set()` are exempted, though `new Promise(executor)` has been reclassified as unsafe

- Knex builders are exempted:

  ```typescript
  knex.builder().method();
  ```
