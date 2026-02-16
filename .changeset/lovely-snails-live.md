---
'skuba': minor
---

lint: Migrate `pnpm-workspace.yaml` skuba configuration to `pnpm-plugin-skuba`

This change migrates the `pnpm-workspace.yaml` configuration used by skuba to use a pnpm configuration plugin instead.

The migration includes removing the `minimumReleaseAgeExcludeOverload` settings from `package.json` and migrating them to `pnpm-workspace.yaml`
