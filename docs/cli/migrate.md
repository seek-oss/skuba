---
parent: CLI
nav_order: 7
---

# Migrate

---

## skuba migrate help

Echoes the available **skuba** migrations

```shell
skuba migrate help
```

---

## skuba migrate node-version

`skuba migrate node-version` will attempt to automatically upgrade projects to Node.js 20.
It will look in the project root for Dockerfiles, `.nvmrc`, and Serverless files,
as well as CDK files in `infra/` and `.buildkite/` files, and try to upgrade them to a Node.js 20 version.

Other Node.js versions can be specified with `skuba migrate node-version <version>`.

**skuba** might not be able to upgrade all projects, so please check your project for any files that **skuba** missed. It's
possible that **skuba** will modify a file incorrectly, in which case please
[open an issue](https://github.com/seek-oss/skuba/issues/new).

```shell
skuba version
skuba -v
skuba --version
```
