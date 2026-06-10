---
'skuba': patch
---

template/\*-rest-api: Add `deps` stage to Docker builds

API Dockerfiles now use a dedicated `deps` stage to install production dependencies separate from the `build` stage. The `runtime` image copies `node_modules` from this production-only stage, reducing the amount of build tooling and development dependencies carried through the image build process.

```diff
ARG BASE_IMAGE

+ FROM ${BASE_IMAGE} AS deps
+
+ COPY . .
+
+ RUN pnpm prune --prod
+ RUN pnpm install --offline --prod
+
###

FROM ${BASE_IMAGE} AS build
COPY . .

RUN pnpm install --offline
RUN pnpm build
- RUN pnpm prune --prod

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime
WORKDIR /workdir

COPY --from=build /workdir/lib lib
- COPY --from=build /workdir/node_modules node_modules
COPY --from=build /workdir/package.json package.json
+ COPY --from=deps /workdir/node_modules node_modules
```
