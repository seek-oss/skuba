---
'pnpm-plugin-skuba': minor
---

Support pnpm 12

- Added `pnpmfile.v12.mjs`, registered as `12` in `defaultConfigs`. pnpm 12 keeps pnpm 11's settings, so the config is identical for now; it is declared separately because pnpm 12 fails an install on a `pnpm-workspace.yaml` setting it does not recognise
- `pnpmfile.mjs` now targets pnpm 12
