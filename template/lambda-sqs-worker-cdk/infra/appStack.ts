import {
  Duration,
  Stack,
  type StackProps,
  aws_cloudwatch,
  aws_codedeploy,
  aws_iam,
  aws_kms,
  aws_lambda,
  aws_lambda_event_sources,
  aws_lambda_nodejs,
  aws_sns,
  aws_sns_subscriptions,
  aws_sqs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { EnvContextSchema, StageContextSchema } from '../shared/context-types';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stage = StageContextSchema.parse(this.node.tryGetContext('stage'));
    const context = EnvContextSchema.parse(this.node.tryGetContext(stage));

    const accountPrincipal = new aws_iam.AccountPrincipal(this.account);

    const kmsKey = new aws_kms.Key(this, 'kms-key', {
      description: '<%- serviceName %>',
      enableKeyRotation: true,
      admins: [accountPrincipal],
      alias: 'seek/self/<%- serviceName %>',
    });

    kmsKey.grantEncrypt(accountPrincipal);

    const deadLetterQueue = new aws_sqs.Queue(this, 'worker-queue-dlq', {
      queueName: '<%- serviceName %>-dlq',
      encryptionMasterKey: kmsKey,
    });

    const queue = new aws_sqs.Queue(this, 'worker-queue', {
      queueName: '<%- serviceName %>',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      encryptionMasterKey: kmsKey,
    });

    const topic = aws_sns.Topic.fromTopicArn(
      this,
      'source-topic',
      context.sourceSnsTopicArn,
    );

    topic.addSubscription(new aws_sns_subscriptions.SqsSubscription(queue));

    const architecture = '<%- lambdaCdkArchitecture %>';

    const defaultWorkerConfig: aws_lambda_nodejs.NodejsFunctionProps = {
      architecture: aws_lambda.Architecture[architecture],
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      environmentEncryption: kmsKey,
      // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
      // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: false,
    };

    const defaultWorkerBundlingConfig: aws_lambda_nodejs.BundlingOptions = {
      sourceMap: true,
      target: 'node20',
      // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
      externalModules: [],
    };

    const defaultWorkerEnvironment: Record<string, string> = {
      NODE_ENV: 'production',
      // https://nodejs.org/api/cli.html#cli_node_options_options
      NODE_OPTIONS: '--enable-source-maps',
    };

    const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
      ...defaultWorkerConfig,
      entry: './src/app.ts',
      timeout: Duration.seconds(30),
      bundling: defaultWorkerBundlingConfig,
      functionName: '<%- serviceName %>',
      environment: {
        ...defaultWorkerEnvironment,
        ...context.workerLambda.environment,
      },
      // https://github.com/aws/aws-cdk/issues/28237
      // This forces the lambda to be updated on every deployment
      // If you do not wish to use hotswap, you can remove the new Date().toISOString() from the description
      description: `Updated at ${new Date().toISOString()}`,
      reservedConcurrentExecutions: context.workerLambda.reservedConcurrency,
    });

    const alias = worker.addAlias('live', {
      description: 'The Lambda version currently receiving traffic',
    });

    alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue, {
        maxConcurrency: context.workerLambda.reservedConcurrency,
      }),
    );

    const preHook = new aws_lambda_nodejs.NodejsFunction(
      this,
      'worker-pre-hook',
      {
        ...defaultWorkerConfig,
        entry: './src/preHook.ts',
        timeout: Duration.seconds(120),
        bundling: defaultWorkerBundlingConfig,
        functionName: '<%- serviceName %>-pre-hook',
        environment: {
          ...defaultWorkerEnvironment,
          ...context.workerLambda.environment,
          FUNCTION_NAME_TO_INVOKE: worker.functionName,
        },
      },
    );

    worker.grantInvoke(preHook);

    const postHook = new aws_lambda_nodejs.NodejsFunction(
      this,
      'worker-post-hook',
      {
        ...defaultWorkerConfig,
        entry: './src/postHook.ts',
        timeout: Duration.seconds(30),
        bundling: defaultWorkerBundlingConfig,
        functionName: '<%- serviceName %>-post-hook',
        environment: {
          ...defaultWorkerEnvironment,
          ...context.workerLambda.environment,
          FUNCTION_NAME_TO_PRUNE: worker.functionName,
        },
      },
    );

    const prunePermissions = new aws_iam.PolicyStatement({
      actions: [
        'lambda:ListAliases',
        'lambda:ListVersionsByFunction',
        'lambda:DeleteFunction',
      ],
      resources: [worker.functionArn, `${worker.functionArn}:*`],
    });

    postHook.addToRolePolicy(prunePermissions);

    const application = new aws_codedeploy.LambdaApplication(
      this,
      'codedeploy-application',
    );

    const deploymentGroup = new aws_codedeploy.LambdaDeploymentGroup(
      this,
      'codedeploy-group',
      {
        application,
        alias,
        deploymentConfig: aws_codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
      },
    );

    const alarm = new aws_cloudwatch.Alarm(this, 'codedeploy-alarm', {
      metric: alias.metricErrors({
        period: Duration.seconds(60),
      }),
      threshold: 1,
      evaluationPeriods: 1,
    });

    deploymentGroup.addAlarm(alarm);

    deploymentGroup.addPreHook(preHook);

    deploymentGroup.addPostHook(postHook);
  }
}
