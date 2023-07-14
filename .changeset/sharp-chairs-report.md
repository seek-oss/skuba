---
'skuba': major
---

deps: Require Node.js 18.12+

Node.js 16 will reach end of life by September 2023. We have aligned our version support with [sku 18](https://github.com/seek-oss/sku/releases/tag/sku%4012.0.0).

Consider upgrading the Node.js version for your project across:

- `.nvmrc`
- `package.json#/engines/node`
- `@types/node` package version
- CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)
