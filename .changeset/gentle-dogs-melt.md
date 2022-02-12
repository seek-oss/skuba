---
"skuba": patch
---

template/lambda-sqs-worker: Remove `variablesResolutionMode`

This resolves the following deprecation warning in Serverless Framework v3:

```console
Starting with v3.0, the "variablesResolutionMode" option is now useless. You can safely remove it from the configuration
More info: https://serverless.com/framework/docs/deprecations/#VARIABLES_RESOLUTION_MODE
```
