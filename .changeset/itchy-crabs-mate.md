---
'skuba': major
---

format, lint: Migrate projects to Node.js 22

As of **skuba** 10,
`skuba format` and `skuba lint` include patches that attempt to automatically migrate your project to the [active LTS version] of Node.js.
This is intended to minimise effort required to keep up with annual Node.js releases.

With each **skuba** upgrade that includes these patches,
you can locally opt out of the migration by setting the `SKIP_NODE_UPGRADE` environment variable, running `skuba format`, and committing the result.

Changes must be manually reviewed by an engineer before merging the migration output.
See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

[active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases
