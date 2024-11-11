import { LambdaDeployment } from '@seek/aws-codedeploy-infra';
import {
  Duration,
  Stack,
  type StackProps,
  aws_iam,
  aws_kms,
  aws_lambda,
  aws_lambda_event_sources,
  aws_lambda_nodejs,
  aws_secretsmanager,
  aws_sns,
  aws_sqs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { Datadog } from 'datadog-cdk-constructs-v2';

import { config } from './config';

// Updated by https://github.com/seek-oss/rynovate
const DATADOG_EXTENSION_LAYER_VERSION = 64;

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

    // const topic = aws_sns.Topic.fromTopicArn(
    //   this,
    //   'source-topic',
    //   config.sourceSnsTopicArn,
    // );

    // topic.addSubscription(
    //   new aws_sns_subscriptions.SqsSubscription(queue, {
    //     rawMessageDelivery: true, // Remove this property if you require end to end datadog tracing
    //   }),
    // );

    const snsKey = aws_kms.Alias.fromAliasName(
      this,
      'alias-aws-sns',
      'alias/aws/sns',
    );

    const destinationTopic = new aws_sns.Topic(this, 'destination-topic', {
      masterKey: snsKey,
      topicName: '<%- serviceName %>',
    });

    const architecture = '<%- lambdaCdkArchitecture %>';

    const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
      architecture: aws_lambda.Architecture[architecture],
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      environmentEncryption: kmsKey,
      // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
      // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: false,
      entry: './src/app.ts',
      timeout: Duration.seconds(30),
      bundling: {
        sourceMap: true,
        target: 'node20',
        // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
        externalModules: [],
        nodeModules: ['datadog-lambda-js', 'dd-trace'],
      },
      functionName: '<%- serviceName %>',
      environment: {
        ...config.workerLambda.environment,
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,
      },
      // https://github.com/aws/aws-cdk/issues/28237
      // This forces the lambda to be updated on every deployment
      // If you do not wish to use hotswap, you can remove the new Date().toISOString() from the description
      description: `Updated at ${new Date().toISOString()}`,
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
    });

    destinationTopic.grantPublish(worker);

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
      extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
    });

    datadog.addLambdaFunctions([worker]);

    const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
      lambdaFunction: worker,
    });

    workerDeployment.alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue),
    );
  }
}
