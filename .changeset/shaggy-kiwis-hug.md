---
'pnpm-plugin-skuba': patch
'skuba': patch
---

lint: Remove `semver@5.7.2` from `pnpm-workspace.yaml` `trustPolicyExclude` list

This legacy package version is no longer a transitive dependency of skuba.
