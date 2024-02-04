---
'skuba': minor
---

lint: Manage `.npmrc` for pnpm projects

skuba now manages `.npmrc` when a project uses `pnpm` to enable [dependency hoisting](https://pnpm.io/npmrc#dependency-hoisting-settings). It will attempt to strip sensitive auth tokens from the file, and remove `.gitignore` entries that ignore `.npmrc`.
