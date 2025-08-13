---
'skuba': patch
---

lint: Reduce noise from `skuba/no-sync-in-promise-iterable`

- Rule has been disabled on test files (in a `/testing/` subdirectory or named `.test.ts`)

- Knex builders are exempted:

  ```typescript
  knex.builder().methods();
  ```
