---
'pnpm-plugin-skuba': minor
---

Support pnpm 11

- Migrated the pnpmfile from CommonJS (`pnpmfile.cjs`) to ESM (`pnpmfile.mjs`).
- Re-enabled `strictDepBuilds` and set `trustPolicy` to `no-downgrade`.
- Replaced `packageManagerStrictVersion` with `pmOnFail: error`, removing the now-unnecessary `ignorePatchFailures` setting.
