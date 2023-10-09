---
'skuba': patch
---

template: Mount npm build secret to a separate directory

Our templated Buildkite pipelines currently retrieve a temporary `.npmrc`. This file contains an npm read token that allows us to fetch private `@seek`-scoped packages.

New projects now write this file to `/tmp/` on the Buildkite agent and mount it as a secret to `/root/` in Docker. This separation allows you to commit a non-sensitive `.npmrc` to your GitHub repository while avoiding accidental exposure of the npm read token. This is especially important if you are migrating a project to [pnpm](https://pnpm.io/), which houses some of its configuration options in `.npmrc`.

Existing projects are generally advised to wait until we've paved a cleaner migration path for pnpm.
