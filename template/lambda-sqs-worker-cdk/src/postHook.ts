/* eslint-disable no-console */
/* istanbul ignore file */

import {
  CodeDeploy,
  PutLifecycleEventHookExecutionStatusCommand,
} from '@aws-sdk/client-codedeploy';
import {
  type AliasConfiguration,
  DeleteFunctionCommand,
  type FunctionConfiguration,
  LambdaClient,
  ListAliasesCommand,
  ListVersionsByFunctionCommand,
} from '@aws-sdk/client-lambda';
import { z } from 'zod';

const lambda = new LambdaClient();
const codeDeploy = new CodeDeploy();

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

type Status = 'Succeeded' | 'Failed';

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
 * A handler to clean up old Lambda function versions and layers
 */
export const handler = async (
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
