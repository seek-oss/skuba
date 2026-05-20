---
'skuba': patch
---

migration: Allow re-runs of the Vitest migration via the ESM migration with `SKUBA_FORCE_MIGRATE_VITEST=true`

This is useful when migrating a larger project that may have frequent upstream changes that need to be pulled in.

```shell
SKUBA_FORCE_MIGRATE_VITEST=true skuba migrate esm
```
