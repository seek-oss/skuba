---
'skuba': patch
---

template/lambda-sqs-worker: Fix a bug where the logger was mutating the context. We now perform a shallow copy when retrieving the logger context from AsyncLocalStorage
