---
'skuba': minor
---

**upgrade**: Add automated migration from `skuba build-package` to `tsdown`

Introduces a new upgrade patch for version 13.1.1 that automatically replaces `skuba build-package` commands with `tsdown` in package.json scripts. This patch:

- Scans all package.json files in monorepos and single-package projects
- Identifies packages using `skuba build-package` in their build scripts
- Replaces the command with `tsdown` while preserving other script content
- Only processes likely package directories (skips non-package workspaces)
