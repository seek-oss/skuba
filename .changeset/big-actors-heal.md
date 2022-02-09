---
"skuba": major
---

Require Node.js 14.18+

Node.js 12 will reach end of life by April 2022. The `semantic-release` package and stable `--enable-source-maps` flag necessitate this new minimum version.

Consider upgrading the Node.js version for your project across:

- `.nvmrc`
- `package.json#/engines/node`
- CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)
