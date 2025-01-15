---
'skuba': major
---

migrate: Introduce `skuba migrate node22` to automatically upgrade a project's Node.js version

`skuba migrate node22` will attempt to automatically upgrade projects to Node.js 22.
It will look in the project root for Dockerfiles, `.nvmrc`, `.node-version`, `tsconfig.json`, `package.json` and Serverless files,
as well as CDK files in `infra/` and `.buildkite/` files, and try to upgrade them to a Node.js 22 version.

skuba might not be able to upgrade all projects, so please check your project for any files that skuba missed. It's
possible that skuba will modify a file incorrectly, in which case please
[open an issue](https://github.com/seek-oss/skuba/issues/new).

Node.js 22 comes with its own breaking changes, so please read the [Node.js 22 release notes](https://nodejs.org/en/blog/announcements/v22-release-announce) alongside the skuba release notes. In addition,

- For AWS Lambda runtime updates to `nodejs22.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.
- You may need to upgrade your versions of CDK and Serverless as appropriate to support nodejs22.x.
