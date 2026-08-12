---
'skuba': minor
---

init: Support scaffolding into an existing repository

`skuba init` now detects when it is run from inside an existing Git repository or
workspace and offers to scaffold the new project as an additional workspace
project rather than a standalone repo. Any template works in this mode, whether
it's a package or an application such as a Lambda worker or an API. Because
detection is location-based, it asks you to confirm before switching modes.

In this mode it skips `git init`, remote and push setup, leaves root-owned config
(`.gitignore`, `.prettierignore`, `.prettierrc.js`, `eslint.config.js`,
`.dockerignore`, Renovate) to the workspace root, registers the project in the
root `pnpm-workspace.yaml` when it isn't already covered, and installs against
the root lockfile. The `pnpm-workspace.yaml` edit is applied through the file's
syntax tree so surrounding keys, comments and formatting are preserved. Only pnpm
workspaces are supported in this mode. Running `skuba init` outside of a
repository is unchanged.
