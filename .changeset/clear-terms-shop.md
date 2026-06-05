---
'skuba': minor
---

template/\*-rest-api: Prune development dependencies from Docker builds

API template Dockerfiles now prune and reinstall production-only dependencies in
the build stage before building. The runtime image continues to copy
`node_modules` from the build stage, reducing the amount of build tooling and
development dependencies carried through to the final image.

```diff
ARG BASE_IMAGE

FROM ${BASE_IMAGE} AS build
COPY . .

- RUN pnpm install --offline
+ RUN pnpm prune --prod
+ RUN pnpm install --offline --prod
RUN pnpm build

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir

COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=build /workdir/node_modules node_modules
```
