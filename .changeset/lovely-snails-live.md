---
'skuba': minor
---

lint: Migrate `pnpm-workspace.yaml` skuba configuration to `.pnpmfile.cjs`

This change migrates the `pnpm-workspace.yaml` configuration used by skuba to a new `.pnpmfile.cjs` file.

The migration includes removing the `minimumReleaseAgeExcludeOverload` settings from `pnpm-workspace.yaml` and transferring them to the new `.pnpmfile.cjs` file.'
