---
'skuba': patch
---

lint: Add `CI=true` to production install step in Dockerfile

Our API templates include a `RUN pnpm install --prod` Dockerfile instruction to prune `devDependencies` from `node_modules`. However, pruning [may not behave as expected](https://redirect.github.com/pnpm/pnpm/issues/9966) in the absence of the `CI` flag, and [pnpm v10.16.0](https://github.com/pnpm/pnpm/releases/tag/v10.16.0) emits the following error if the environment variable is not set:

```console
ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY  Aborted removal of modules directory due to no TTY
If you are running pnpm in CI, set the CI environment variable to "true".
```

We will try to apply a one-time [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) to your project to add the `CI` environment variable to Dockerfiles that have a `RUN pnpm install --prod` instruction:

```diff
- RUN pnpm install --offline --prod
+ RUN CI=true pnpm install --offline --prod
```
