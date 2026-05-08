---
'skuba': minor
---

lint: Migrate Dockerfiles from `pnpm install --prod` to `pnpm prune --prod`

A new [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) will replace any `RUN pnpm install ... --prod` (including variants with `CI=true`) with `RUN pnpm prune --prod`, which is a more explicit and reliable way to remove dev dependencies from the production image. You may see a reduction in container vulnerabilities as a result of this change.
