---
nav_order: 3
parent: Templates
---

# Worker

---

## lambda-sqs-worker-cdk

An asynchronous [worker] built on [AWS Lambda] and deployed with [AWS CDK].

```text
SNS -> SQS (with a dead-letter queue) -> Lambda
```

Comes with configuration validation and infrastructure snapshot testing.

[View on GitHub](https://github.com/seek-oss/skuba/tree/main/template/lambda-sqs-worker-cdk)

[aws cdk]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346041/#CDK
[aws lambda]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346041/#Lambda-updated
[worker]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346236/#Worker
