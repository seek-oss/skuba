import {
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

    const topic = new aws_sns.Topic(this, 'topic', {
      topicName: '<%- serviceName %>',
      masterKey: kmsKey,
    });

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

    const architecture = '<%- lambdaCdkArchitecture %>';

    const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
      architecture: aws_lambda.Architecture[architecture],
      entry: './src/app.ts',
      bundling: {
        sourceMap: true,
        target: 'node20',
        // By default the aws-sdk-v3 is set as an external module, however, we want it to be bundled with the lambda
        externalModules: [],
      },
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      functionName: '<%- serviceName %>',
      environmentEncryption: kmsKey,
      environment: {
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        ...context.workerLambda.environment,
      },
      // aws-sdk-v3 sets this to true by default so it is not necessary to set the environment variable
      awsSdkConnectionReuse: false,
    });

    worker.addEventSource(new aws_lambda_event_sources.SqsEventSource(queue));

    topic.addSubscription(new aws_sns_subscriptions.SqsSubscription(queue));
  }
}
