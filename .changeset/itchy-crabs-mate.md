---
'skuba': major
---

format, lint: Migrate projects to Node.js 22

As of **skuba** 10,
`skuba format` and `skuba lint` include patches that attempt to automatically migrate your project to the [active LTS version] of Node.js.
This is intended to minimise effort required to keep up with annual Node.js releases.

You can opt out of these migrations by setting the `SKIP_NODE_UPGRADE` environment variable before running `skuba format` or `skuba lint`.

See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

[active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases
