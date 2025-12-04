---
'skuba': major
---

migrate: Add `skuba migrate node24`

`skuba migrate node24` will attempt to automatically upgrade projects to Node.js 24 and packages to Node.js 20.

This marks a change from the previous Node.js 20 migration, where applications were upgraded to Node.js 20 and packages were left as is.

Node.js 24 comes with its own breaking changes, so please read the [Node.js 24 release notes](https://nodejs.org/en/blog/release/v24.0.0) alongside the skuba release notes. In addition,

- For AWS Lambda runtime updates to `nodejs24.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.
