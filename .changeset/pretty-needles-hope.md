---
'skuba': patch
---

template/lambda-sqs-worker\*: Set [maximum conurrency](https://aws.amazon.com/blogs/compute/introducing-maximum-concurrency-of-aws-lambda-functions-when-using-amazon-sqs-as-an-event-source/)

This prevents messages from going directly to the DLQ when the function reaches its reserved concurrency limit.
