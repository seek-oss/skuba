---
'skuba': major
---

lint: Migrate `pnpm-workspace.yaml` skuba configuration to `pnpm-plugin-skuba`

This change replaces the managed skuba section in `pnpm-workspace.yaml` with a [pnpm configuration plugin](https://pnpm.io/config-dependencies).

The migration includes removing the `minimumReleaseAgeExcludeOverload` settings from `package.json` and migrating them to `pnpm-workspace.yaml`

This simplifies the managed configuration `skuba` provides, allowing you to override and extend previously un-configurable settings such as `minimumReleaseAge` from your `pnpm-workspace.yaml` file.

Example:

```yaml
minimumReleaseAge: 1440 # 1 day
minimumReleaseAgeExclude:
  - some-package
```
