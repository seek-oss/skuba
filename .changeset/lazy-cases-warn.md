---
'skuba': patch
---

lint: Add `CI=true` environment variable to Dockerfile

The `CI=true` environment variable is needed to run `pnpm install --prod` as it effectively prunes node_modules. This is related to a pnpm issue where production installs don't behave as expected without the CI flag.

Related pnpm issue: https://github.com/pnpm/pnpm/issues/9966

We will try to apply a one-time [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) to your project to add the CI environment variable to Dockerfiles that use the `FROM ${BASE_IMAGE} AS build` pattern.
