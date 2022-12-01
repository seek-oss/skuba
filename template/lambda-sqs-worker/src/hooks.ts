/* eslint-disable no-console */
/* istanbul ignore file */

// Use minimal dependencies to reduce the chance of crashes on module load.
import {
  CodeDeployClient,
  PutLifecycleEventHookExecutionStatusCommand,
} from '@aws-sdk/client-codedeploy';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { toUtf8 } from '@aws-sdk/util-utf8-node';

const codeDeploy = new CodeDeployClient({
  apiVersion: '2014-10-06',
  maxAttempts: 5,
});

const lambda = new LambdaClient({
  apiVersion: '2015-03-31',
  maxAttempts: 5,
});

type Status = 'Succeeded' | 'Failed';

/**
 * Synchronously invokes a Lambda function with a smoke test event.
 *
 * Any non-error response is treated as a success.
 */
const smokeTestLambdaFunction = async (): Promise<Status> => {
  const functionName = process.env.FUNCTION_NAME_TO_INVOKE;

  if (!functionName) {
    console.error('Missing process.env.FUNCTION_NAME_TO_INVOKE');
    return 'Failed';
  }

  console.info('Function:', functionName);

  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      // Treat an empty object as our smoke test event.
      Payload: Buffer.from('{}'),
    }),
  );

  console.info('Version:', response.ExecutedVersion ?? '?');
  console.info('Status', response.StatusCode ?? '?');

  if (response.FunctionError) {
    console.error('Error:', response.FunctionError);
    if (response.Payload) {
      console.error(toUtf8(response.Payload));
    }
    return 'Failed';
  }

  return response.StatusCode === 200 ? 'Succeeded' : 'Failed';
};

/**
 * The event supplied to a CodeDeploy lifecycle hook Lambda function.
 *
 * {@link https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-ecs-with-hooks-create-hooks.html}
 */
interface CodeDeployLifecycleHookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

/**
 * A handler to smoke test a new Lambda function version before it goes live.
 *
 * This tries to be exception safe so that a status reaches CodeDeploy. If we
 * crash or otherwise fail to report back, the deployment will hang for an hour.
 */
export const pre = async (
  event: CodeDeployLifecycleHookEvent,
): Promise<void> => {
  let status: Status;
  try {
    status = await smokeTestLambdaFunction();
  } catch (err) {
    console.error('Exception:', err);
    status = 'Failed';
  }

  await codeDeploy.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId: event.DeploymentId,
      lifecycleEventHookExecutionId: event.LifecycleEventHookExecutionId,
      status,
    }),
  );
};
