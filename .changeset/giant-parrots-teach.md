---
'skuba': patch
---

template/lambda-sqs-worker: Switch to modern Datadog integration

Datadog's CloudWatch integration and the associated [`createCloudWatchClient`](https://github.com/seek-oss/datadog-custom-metrics/pull/177) function from [`seek-datadog-custom-metrics`](https://github.com/seek-oss/datadog-custom-metrics) have been deprecated. We recommend [Datadog's Lambda Extension](https://docs.datadoghq.com/serverless/libraries_integrations/extension/) along with their first-party [datadog-lambda-js](https://github.com/DataDog/datadog-lambda-js) and [dd-trace](https://github.com/DataDog/dd-trace-js) npm packages.
