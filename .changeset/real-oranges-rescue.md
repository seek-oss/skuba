---
'skuba': major
---

format: Automatically upgrade projects to Node.js 20

`skuba format` will now attempt to automatically upgrade projects to Node.js 20.
It will look in the project root for Dockerfiles, `.nvmrc`, and Serverless files,
as well as CDK files in `infra/`, using Node.js 18 and try to upgrade them to Node.js 20.

skuba might not be able to upgrade all projects, so please check your project for any files that skuba missed. It's
possible that skuba will modify a file incorrectly, in which case please
[open an issue](https://github.com/seek-oss/skuba/issues/new).

If you cannot upgrade to Node.js 20, after upgrading skuba, you can run `skuba format` with the environment variable
`SKIP_NODE_20_PATCH=true` to prevent skuba from upgrading to Node.js 20.
This is required on the first run of `skuba format` after upgrading skuba only.

Please read the [Node.js 20 release notes](https://nodejs.org/en/blog/announcements/v20-release-announce) alongside the
skuba release notes.

A future version of skuba will drop support for Node.js 18.
