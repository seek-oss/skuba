---
'skuba': patch
---

lint: Preserve `pnpm install --prod` after `pnpm prune --prod` in Dockerfiles

The `pnpm install --prod` → `pnpm prune --prod` patch introduced in [#2326](https://github.com/seek-oss/skuba/pull/2326) now leaves a `RUN pnpm install … --prod` line untouched when it is immediately preceded by `RUN pnpm prune --prod`.

This protects the monorepo workaround for [pnpm/pnpm#8307](https://github.com/pnpm/pnpm/issues/8307), where `pnpm prune --prod` alone does not correctly remove dev dependencies and a follow-up `pnpm install --prod` is required.
