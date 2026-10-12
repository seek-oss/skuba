---
'skuba': minor
---

init: Support scaffolding into an existing repository

`skuba init` now detects when it is run from inside an existing pnpm workspace and offers to scaffold the new project as an additional workspace project rather than a standalone repo. Any template works in this mode, whether it's a package or an application such as a Lambda worker or an API. Because detection is location-based, it asks you to confirm before switching modes.

In this mode, `skuba init`:

- Skips `git init`, remote and push setup
- Leaves root-owned config to the workspace root: `.gitignore`, `.prettierignore`, `.prettierrc.js`, `eslint.config.js`, `.dockerignore`, `.npmrc`, `.nvmrc`, Renovate, `.github` and `.vscode`
- Registers the project in the root `pnpm-workspace.yaml` when it isn't already covered, preserving surrounding keys, comments and formatting
- Installs against the root lockfile
- Prompts for a project name, which answers the template field that names the project (`serviceName` for services, `moduleName` for packages) rather than asking for the same thing twice. Where a template validates that field, the project name pre-fills the prompt instead of replacing it.

Only pnpm workspaces (detected via a root `pnpm-workspace.yaml`) are supported in this mode. Yarn/npm workspaces and plain Git repositories keep the standalone behaviour, and running `skuba init` outside of a repository is unchanged.
