---
'skuba': patch
---

**template/lambda-sqs-worker:** Use new `serverless.yml#/provider/iam` grouping

The `provider.iamRoleStatements` property [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.25.1/docs/deprecations.md#grouping-iam-settings-under-provideriam).
