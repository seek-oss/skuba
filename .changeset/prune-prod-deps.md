---
'skuba': patch
---

**template/\*-rest-api:** Use `pnpm prune --prod` to remove dev dependencies in Dockerfiles

Our API template Dockerfiles previously ran `CI=true pnpm install --offline --prod` after building to strip dev dependencies from `node_modules`. This has been replaced with `pnpm prune --prod`, which is a more explicit and reliable way to remove dev dependencies from the production image.

```diff
RUN pnpm install --offline
RUN pnpm build
- RUN CI=true pnpm install --offline --prod
+ RUN pnpm prune --prod
```

**lint:** Update Dockerfile patch to migrate `pnpm install --prod` to `pnpm prune --prod`

The existing Dockerfile patch will now replace any `RUN pnpm install ... --prod` (including variants with `CI=true`) with `RUN pnpm prune --prod`.
