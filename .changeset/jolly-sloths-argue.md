---
'skuba': minor
---

lint: Migrate Dockerfiles from `pnpm install --prod` to `pnpm prune --prod`

A new [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) will replace any `RUN pnpm install ... --prod` (including variants with `CI=true`) with `RUN pnpm prune --prod`.
