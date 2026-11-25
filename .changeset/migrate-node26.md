---
'skuba': minor
---

lint/migrate: Introduce `skuba migrate node26`

[`skuba migrate node26`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node26) attempts to automatically upgrade your:

- Project to Node.js 26
- Package targets to Node.js 24.11.0+
- `aws-cdk-lib`, `datadog-cdk-constructs-v2`, `osls`, `serverless`, `serverless-plugin-datadog`, and `@types/node` dependencies to versions that support Node.js 26
- Pinned Datadog Node.js Lambda layer versions in CDK code to a version that supports Node.js 26
- Dockerfiles to install a pinned pnpm version instead of using Corepack, as Node.js 26 no longer bundles it
- `package.json#/packageManager` fields to `package.json#/devEngines/packageManager`, including Buildkite pipelines that cache on the field

Changes must be manually reviewed by an engineer before committing the migration output. If you have an npm package that previously supported Node.js ≤22 and was upgraded to target Node.js 24.11.0+, follow semantic versioning and publish the change as a new major version. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

**skuba** may not be able to upgrade all projects. Check your project for files that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

Node.js 26 includes breaking changes. For more information on the upgrade, refer to the [Node.js release notes](https://nodejs.org/en/blog/release/v26.0.0).
