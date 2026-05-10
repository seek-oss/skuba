---
'skuba': minor
---

migrate: Add ESM migration

This migration attempts to automatically migrate your project from CommonJS to ESM.

If you have `skuba` installed as a direct dependency, this migration runs automatically as part of `skuba format` and `skuba lint`.

If your project does not use `skuba` directly, you can run our migration to ESM using `npx` or `pnpm dlx`:

```shell
pnpm dlx skuba migrate esm
npx skuba migrate esm
```

View the [migration guide](https://seek-oss.github.io/skuba/docs/cli/migrate#skuba-migrate-esm) for more details.
