---
'skuba': patch
---

template: Update to Node 20

Consider upgrading the Node.js version for your project across:

- `.nvmrc`
- `package.json#/engines/node`
- `serverless.yml`
- `@types/node` package version
- CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

If you are updating your AWS Lambda runtime to `nodejs20.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.
