---
'skuba': patch
---

**template/lambda-sqs-worker:** Lock Serverless `lambdaHashingVersion`

This gets rid of the following warning when deploying:

```text
Deprecation warning: Starting with next major version, default value of provider.lambdaHashingVersion will be equal to "20201221"
More Info: https://www.serverless.com/framework/docs/deprecations/#LAMBDA_HASHING_VERSION_V2
```
