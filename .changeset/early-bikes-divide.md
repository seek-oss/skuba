---
"skuba": patch
---

template/lambda-sqs-worker: Convert Serverless `isProduction` config value to boolean

This avoids potentially surprising behaviour if you try to make use of this config value in a context that tests for truthiness. The boolean is still correctly applied as a string `seek:env:production` tag value.
