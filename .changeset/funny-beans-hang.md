---
'skuba': major
---

migrate: Introduce `skuba migrate node24`

`skuba migrate node24` attempts to automatically upgrade your:

- Project to Node.js 24
- Package targets to Node.js 20, given Node.js 18 reached end of life in March 2025
- `aws-cdk-lib`, `datadog-cdk-constructs-v2`, `osls`, `serverless`, `serverless-plugin-datadog`, and `@types/node` dependencies to versions that support Node.js 24

Changes must be manually reviewed by an engineer before committing the migration output. If you have an npm package that previously supported Node.js ≤18 and was upgraded to target Node.js 20, follow semantic versioning and publish the change as a new major version. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

**skuba** may not be able to upgrade all projects. Check your project for files that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

Node.js 22 includes breaking changes. For more information on the upgrade, refer to:

- The [Node.js release notes](https://nodejs.org/en/blog/release/v24.0.0)
- The AWS [release announcement](https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/) for the Lambda `nodejs24.x` runtime update
