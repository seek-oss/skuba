---
'skuba': patch
---

template: Install specific pnpm version via Corepack

Previously, our Dockerfiles ran `corepack enable pnpm` without installing a specific version. This does not guarantee installation of the pnpm version specified in `package.json`, which could cause a subsequent `pnpm install --offline` to run Corepack online or otherwise hang on stdin:

```dockerfile
FROM --platform=arm64 node:20-alpine

RUN corepack enable pnpm
```

```json
{
  "packageManager": "pnpm@8.15.4",
  "engines": {
    "node": ">=20"
  }
}
```

```console
Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-8.15.4.tgz.

Do you want to continue? [Y/n]
```

To avoid this issue, modify (1) Buildkite pipelines to cache on the `packageManager` property in `package.json`, and (2) Dockerfiles to mount `package.json` and run `corepack install`:

```diff
- seek-oss/docker-ecr-cache#v2.1.0:
+ seek-oss/docker-ecr-cache#v2.2.0:
    cache-on:
     - .npmrc
+    - package.json#.packageManager
     - pnpm-lock.yaml
```

```diff
FROM --platform=arm64 node:20-alpine

- RUN corepack enable pnpm
+ RUN --mount=type=bind,source=package.json,target=package.json \
+ corepack enable pnpm && corepack install
```
