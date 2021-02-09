---
"skuba": patch
---

**template/lambda-sqs-worker:** serverless-plugin-canary-deployments ^0.5.0

The plugin now patches in CodeDeploy permissions to your `iamRoleStatements`, so you can clean your `serverless.yml`:

```diff
- - Action: codedeploy:PutLifecycleEventHookExecutionStatus
-   Effect: Allow
-   Resource: !Sub arn:aws:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:*/${WorkerLambdaFunctionDeploymentGroup}
