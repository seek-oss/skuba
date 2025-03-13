---
'skuba': major
---

migrate: Introduce `skuba migrate node22`

[`skuba migrate node22`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node22) attempts to automatically upgrade your project to Node.js 22. Changes must be manually reviewed by an engineer before committing the migration output. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

**skuba** may not be able to upgrade all projects. Check your project for files that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

Node.js 22 includes breaking changes. For more information on the upgrade, refer to:

- The Node.js [release notes][node-22]
- The AWS [release announcement][aws-22] for the Lambda `nodejs22.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs22.x`.

[aws-22]: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
[node-22]: https://nodejs.org/en/blog/announcements/v22-release-announce
