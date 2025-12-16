---
'skuba': major
---

format, lint: Migrate projects to Node.js 24 and package targets to Node.js 20

You can locally opt out of the migration by setting the `SKIP_NODE_UPGRADE` environment variable, running `skuba format`, and committing the result.

Changes must be manually reviewed by an engineer before merging the migration output. If you have an npm package that previously supported Node.js ≤18 and was upgraded to target Node.js 20, follow semantic versioning and publish the change as a new major version. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.
