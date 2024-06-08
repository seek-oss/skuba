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
  aws_secretsmanager,
  aws_sns,
  aws_sns_subscriptions,
  aws_sqs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { Datadog, getExtensionLayerArn } from 'datadog-cdk-constructs-v2';

import { config } from './config';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const accountPrincipal = new aws_iam.AccountPrincipal(this.account);

    const kmsKey = new aws_kms.Key(this, 'kms-key', {
      description: '<%- serviceName %>',
      enableKeyRotation: true,
      admins: [accountPrincipal],
      alias: 'seek/self/<%- serviceName %>',
    });

    kmsKey.grantEncrypt(accountPrincipal);

    const deadLetterQueue = new aws_sqs.Queue(
      this,
      'worker-queue-dead-letters',
      {
        queueName: '<%- serviceName %>-dead-letters',
        encryptionMasterKey: kmsKey,
      },
    );

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
      config.sourceSnsTopicArn,
    );

    topic.addSubscription(new aws_sns_subscriptions.SqsSubscription(queue));

    const snsKey = aws_kms.Alias.fromAliasName(
      this,
      'alias-aws-sns',
      'alias/aws/sns',
    );

    const destinationTopic = new aws_sns.Topic(this, 'destination-topic', {
      masterKey: snsKey,
      topicName: '<%- serviceName %>',
    });

    const datadogSecret = aws_secretsmanager.Secret.fromSecretPartialArn(
      this,
      'datadog-api-key-secret',
      config.datadogApiKeySecretArn,
    );

    const datadog = new Datadog(this, 'datadog', {
      apiKeySecret: datadogSecret,
      addLayers: false,
      enableDatadogLogs: false,
      flushMetricsToLogs: false,
      extensionLayerVersion: 58,
    });

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
        ...config.workerLambda.environment,
        DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,
      },
      // https://github.com/aws/aws-cdk/issues/28237
      // This forces the lambda to be updated on every deployment
      // If you do not wish to use hotswap, you can remove the new Date().toISOString() from the description
      description: `Updated at ${new Date().toISOString()}`,
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
      layers: [
        // Workaround for https://github.com/DataDog/datadog-cdk-constructs/issues/201
        aws_lambda.LayerVersion.fromLayerVersionArn(
          this,
          'datadog-layer',
          getExtensionLayerArn(
            this.region,
            datadog.props.extensionLayerVersion as number,
            defaultWorkerConfig.architecture === aws_lambda.Architecture.ARM_64,
          ),
        ),
      ],
    });

    datadog.addLambdaFunctions([worker]);

    const alias = worker.addAlias('live', {
      description: 'The Lambda version currently receiving traffic',
    });

    alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue, {
        maxConcurrency: config.workerLambda.reservedConcurrency,
      }),
    );

    const preHook = new aws_lambda_nodejs.NodejsFunction(
      this,
      'worker-pre-hook',
      {
        ...defaultWorkerConfig,
        entry: './src/hooks.ts',
        handler: 'pre',
        timeout: Duration.seconds(120),
        bundling: defaultWorkerBundlingConfig,
        functionName: '<%- serviceName %>-pre-hook',
        environment: {
          ...defaultWorkerEnvironment,
          ...config.workerLambda.environment,
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
        entry: './src/hooks.ts',
        handler: 'post',
        timeout: Duration.seconds(30),
        bundling: {
          ...defaultWorkerBundlingConfig,
          nodeModules: ['datadog-lambda-js', 'dd-trace'],
        },
        functionName: '<%- serviceName %>-post-hook',
        environment: {
          ...defaultWorkerEnvironment,
          ...config.workerLambda.environment,
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
