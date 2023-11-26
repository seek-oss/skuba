---
'skuba': minor
---

template/lambda-sqs-worker-cdk: Introduce bundling with esbuild, `--hotswap` and `--watch`

This template now uses the `aws_lambda_nodejs.NodejsFunction` construct which uses esbuild to bundle the lambda. This [reduces the cold start time](https://aws.amazon.com/blogs/developer/reduce-lambda-cold-start-times-migrate-to-aws-sdk-for-javascript-v3/) and time to build on CI.

The `--hotswap` and `--watch` options allow you to rapidly deploy your code changes to AWS, enhancing the developer feedback loop. This change introduces `deploy:hotswap` and `deploy:watch` scripts to the package.json file and a `Deploy Dev (Hotswap)` step to the Buildkite pipeline. Read more about watch and hotswap [on the AWS Developer Tools Blog](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/).
