---
'skuba': minor
---

lint: Migrate `pnpm-workspace.yaml` skuba configuration to `pnpm-plugin-skuba`

This change migrates the `pnpm-workspace.yaml` configuration used by skuba to use a pnpm configuration plugin instead.

The migration includes removing the `minimumReleaseAgeExcludeOverload` settings from `package.json` and migrating them to `pnpm-workspace.yaml`

This simplifies the managed configuration `skuba` provides, allowing you to override previously un-configurable settings such as `minimumReleaseAge` from your `pnpm-workspace.yaml` file.

Example:

```yaml
minimumReleaseAge: 1440 # 1 day
```
