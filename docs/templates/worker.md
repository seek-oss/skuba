---
nav_order: 3
parent: Templates
---

# Worker

---

## lambda-sqs-worker

An asynchronous [worker] built on [AWS Lambda] and deployed with [Serverless].

Modelled after the "enricher" pattern where an event is received from a source SNS topic and a corresponding enrichment is published to a destination SNS topic.
For fault tolerance,
a message queue is employed between the source topic and the Lambda function,
and unprocessed events are sent to a dead-letter queue for manual triage.

[View on GitHub](https://github.com/seek-oss/skuba/tree/main/template/lambda-sqs-worker)

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
[serverless]: https://serverless.com/
[worker]: https://myseek.atlassian.net/wiki/spaces/AA/pages/2358346236/#Worker
