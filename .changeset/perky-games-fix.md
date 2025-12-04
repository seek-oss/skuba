---
'skuba': major
---

format, lint: Migrate projects to Node.js 24, packages to Node.js 20

You can locally opt out of the migration by setting the `SKIP_NODE_UPGRADE` environment variable, running `skuba format`, and committing the result.

All migration changes require manual review before merging. Ensure you document any breaking changes from in your package changelogs.

See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.
