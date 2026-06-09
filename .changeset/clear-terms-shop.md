---
'skuba': patch
---

template/\*-rest-api: Prune development dependencies from Docker builds

API template Dockerfiles now prune and reinstall production-only dependencies in
the build stage before building. The runtime image continues to copy
`node_modules` from the build stage, reducing the amount of build tooling and
development dependencies carried through to the final image.

```diff
FROM ${BASE_IMAGE} AS build
COPY . .

RUN pnpm install --offline
RUN pnpm build
+ RUN pnpm prune --prod
+ RUN pnpm install --offline --prod
```
