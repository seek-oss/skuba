---
'skuba': major
---

format, lint: Migrate `pnpm` projects to store settings in `pnpm-workspace.yaml` instead of `.npmrc`.

This change follows the `pnpm` recommendation in `pnpm` version 10.

As part of this change:

- `.npmrc` is back in **skuba**’s managed `.gitignore` section
- **skuba** will attempt to delete `.npmrc` and migrate its contents to `pnpm-workspace.yaml`. If any custom settings are found, they will be added but commented out for you to review and fix.
- **skuba** will attempt to migrate references to `.npmrc` in Buildkite pipelines and Dockerfiles

**skuba** may not be able to correctly migrate all projects. Check your project for changes that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

**Important**: Monorepos with setups which do not run `skuba lint` in the workspace root will need manual action for this change.
Either apply the changes by hand, or run `skuba format` locally in the workspace root to apply the changes.
