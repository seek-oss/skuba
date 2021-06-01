---
'skuba': patch
---

**template:** Prune `devDependencies` instead of installing twice in Docker

The template-bundled Dockerfiles would previously run `yarn install` twice to build a separate stage for production `dependencies` only. These have been updated to correctly share the Yarn cache across stages and to use `yarn install --production` to perform offline pruning.
