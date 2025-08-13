---
'skuba': patch
---

lint: Reduce noise from `skuba/no-sync-in-promise-iterable`

- Rule has been disabled on files in a `/testing/` subdirectory or named `.test.ts`

- Global object constructors like `new Map()` and `new Set()` are exempted, though `new Promise(executor)` has been reclassified as unsafe

- Knex builders like `knex.builder().method()` are exempted
