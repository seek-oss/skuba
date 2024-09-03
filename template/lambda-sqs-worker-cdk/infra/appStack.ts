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
  aws_sns,
  aws_sns_subscriptions,
  aws_sqs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
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
      },
      // https://github.com/aws/aws-cdk/issues/28237
      // This forces the lambda to be updated on every deployment
      // If you do not wish to use hotswap, you can remove the new Date().toISOString() from the description
      description: `Updated at ${new Date().toISOString()}`,
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
    });

    const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
      lambdaFunction: worker,
    });

    workerDeployment.alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue),
    );
  }
}
