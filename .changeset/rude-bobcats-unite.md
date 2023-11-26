---
'skuba': minor
---

template/lambda-sqs-worker-cdk: Introduce bundling with esbuild

This template now uses the `aws_lambda_nodejs.NodejsFunction` construct which uses esbuild to bundle the lambda. This [reduces the cold start time](https://aws.amazon.com/blogs/developer/reduce-lambda-cold-start-times-migrate-to-aws-sdk-for-javascript-v3/) and time to build on CI. 
