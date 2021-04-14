---
'skuba': patch
---

**template/lambda-sqs-worker:** Use new `serverless.yml#/package/patterns` property

The `package.exclude` and `package.include` properties [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.32.0/docs/deprecations.md#new-way-to-define-packaging-patterns).
