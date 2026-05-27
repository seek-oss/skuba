---
'skuba': minor
---

lint: Remove stale managed entries from `pnpm-workspace.yaml`

This update removes entries with `# Managed by skuba` annotations from `pnpm-workspace.yaml` that no longer match skuba's managed configuration, cleans up any orphaned empty sections left behind, and runs `pnpm install` to update the lockfile when managed `overrides` are added or changed.
