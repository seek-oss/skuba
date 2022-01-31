---
"skuba": patch
---

template/lambda-sqs-worker: Remove `provider.lambdaHashingVersion`

This resolves the following deprecation warning in Serverless Framework v3:

```console
Setting "20201221" for "provider.lambdaHashingVersion" is no longer effective as new hashing algorithm is now used by default. You can safely remove this property from your configuration.
```
