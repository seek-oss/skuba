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

## skuba migrate node20

`skuba migrate node20` will attempt to automatically upgrade projects to Node.js 20.
It will look in the project root for Dockerfiles, `.nvmrc`, and Serverless files,
as well as CDK files in `infra/` and `.buildkite/` files, and try to upgrade them to a Node.js 20 version.

**skuba** might not be able to upgrade all projects, so please check your project for any files that **skuba** missed. It's
possible that **skuba** will modify a file incorrectly, in which case please
[open an issue](https://github.com/seek-oss/skuba/issues/new).

Node.js 20 comes with its own breaking changes, so please read the [Node.js 20 release notes](https://nodejs.org/en/blog/announcements/v20-release-announce) alongside the skuba release notes. In addition,

- For AWS Lambda runtime updates to `nodejs20.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.
- You may need to upgrade your versions of CDK and Serverless as appropriate to support nodejs20.x.

```shell
skuba migrate node20
```
