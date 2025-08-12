---
'skuba': patch
---

template/lambda-sqs-worker-cdk: Use Datadog runtime layer

This template historically configured the Datadog CDK Construct to exclude the Node.js Lambda layer with [`addLayers: false`](https://docs.datadoghq.com/serverless/libraries_integrations/cdk/#configuration). This ensured that the `datadog-lambda-js` and `dd-trace` dependency versions declared in `package.json` were the ones running in your deployed Lambda function.

We are now recommending use of the Node.js Lambda layer to align with ecosystem defaults and simplify our build process. Renovate can be configured to keep versioning of the Node.js Lambda layer and `datadog-lambda-js` in sync, but the `dd-trace` version may drift over time. See the [`seek-oss/rynovate` PR](https://github.com/seek-oss/rynovate/pull/185) for implementation details.
