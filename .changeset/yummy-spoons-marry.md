---
'skuba': minor
---

migrate: Add file extensions migration

This migration attempts to add file extensions to your imports to improve compatibility with ESM.

If you have `skuba` installed as a direct dependency, this migration runs automatically as part of `skuba format` and `skuba lint`.

This migration is also run as part of `skuba migrate esm`, however, you may choose to run it separately beforehand to minimise the number of changes that need to be made to your source files in the ESM migration.

```shell
pnpm dlx skuba migrate file-extensions
npx skuba migrate file-extensions
```
