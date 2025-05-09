---
skuba: 'patch'
---

template/lambda-sqs-worker-cdk: Support expedited deployments

This change to **skuba**’s CDK template allows skipping smoke tests when the Buildkite build that deploys the lambda has a `[skip smoke]` directive in the build message. See [`@seek/aws-codedeploy-hooks`](https://github.com/seek-oss/aws-codedeploy-hooks/tree/main/packages/hooks) for more details.
