---
'skuba': patch
---

**template/lambda-sqs-worker-\*:** Build once upfront

This employs Buildkite [artifacts](https://buildkite.com/docs/pipelines/artifacts) to share compiled code with each subsequent deployment step.
