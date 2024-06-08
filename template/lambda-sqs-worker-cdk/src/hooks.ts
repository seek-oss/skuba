/* eslint-disable no-console */
/* istanbul ignore file */

import {
  CodeDeployClient,
  PutLifecycleEventHookExecutionStatusCommand,
} from '@aws-sdk/client-codedeploy';
import {
  type AliasConfiguration,
  DeleteFunctionCommand,
  type FunctionConfiguration,
  InvokeCommand,
  LambdaClient,
  ListAliasesCommand,
  ListVersionsByFunctionCommand,
} from '@aws-sdk/client-lambda';
import { z } from 'zod';

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
      console.error(response.Payload.transformToString());
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

const listLambdaVersions = async (
  functionName: string,
  marker?: string,
): Promise<FunctionConfiguration[]> => {
  const result = await lambda.send(
    new ListVersionsByFunctionCommand({
      FunctionName: functionName,
      Marker: marker,
    }),
  );
  const versions = result.Versions ?? [];
  if (result.NextMarker) {
    return [
      ...versions,
      ...(await listLambdaVersions(functionName, result.NextMarker)),
    ];
  }

  return versions;
};

const listAliases = async (
  functionName: string,
  marker?: string,
): Promise<AliasConfiguration[]> => {
  const result = await lambda.send(
    new ListAliasesCommand({
      FunctionName: functionName,
      Marker: marker,
    }),
  );
  const aliases = result.Aliases ?? [];
  if (result.NextMarker) {
    return [
      ...aliases,
      ...(await listAliases(functionName, result.NextMarker)),
    ];
  }

  return aliases;
};

const pruneLambdas = async (
  functionName: string,
  numberToKeep: number,
): Promise<void> => {
  const [aliases, versions] = await Promise.all([
    listAliases(functionName),
    listLambdaVersions(functionName),
  ]);

  const aliasMap = new Map(
    aliases.flatMap((alias) =>
      alias.FunctionVersion ? [[alias.FunctionVersion, alias]] : [],
    ),
  );

  const versionsToPrune = versions
    .filter(
      (version) =>
        version.Version &&
        !aliasMap.has(version.Version) &&
        version.Version !== '$LATEST',
    )
    .sort((a, b) => Number(b.Version) - Number(a.Version))
    .slice(numberToKeep);

  if (!versionsToPrune.length) {
    console.log('No function versions to prune');
    return;
  }

  console.log(
    `Pruning function versions: ${versionsToPrune
      .map((version) => version.Version)
      .join(', ')}`,
  );

  await Promise.all(
    versionsToPrune.map((version) =>
      lambda.send(
        new DeleteFunctionCommand({
          FunctionName: version.FunctionName,
          Qualifier: version.Version,
        }),
      ),
    ),
  );
};

const EnvSchema = z.object({
  FUNCTION_NAME_TO_PRUNE: z.string(),
  NUMBER_OF_VERSIONS_TO_KEEP: z.coerce.number().default(0),
});

/**
 * A hook to clean up old Lambda function versions and layers
 */
export const post = async (
  event: CodeDeployLifecycleHookEvent,
): Promise<void> => {
  let status: Status = 'Succeeded';
  try {
    const {
      FUNCTION_NAME_TO_PRUNE: functionName,
      NUMBER_OF_VERSIONS_TO_KEEP: numberToKeep,
    } = EnvSchema.parse(process.env);

    await pruneLambdas(functionName, numberToKeep);
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
