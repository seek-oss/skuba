---
'skuba': patch
---

**template/lambda-sqs-worker:** Remove custom Serverless variable syntax

`serverless@2.3.0` bundled native support for CloudFormation pseudo parameters. This even works with arbitrary logical IDs like `!Sub ${WorkerLambdaFunctionDeploymentGroup}`.
