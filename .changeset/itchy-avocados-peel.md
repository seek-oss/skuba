---
'skuba': minor
---

lint: Manage `.npmrc` for pnpm projects

skuba now manages a section of `.npmrc` when a project uses `pnpm` to enable [dependency hoisting](https://pnpm.io/npmrc#dependency-hoisting-settings). It will continue to avoid committing autofixes to the file if it contains auth secrets.
