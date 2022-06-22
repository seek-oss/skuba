import {
  Stack,
  StackProps,
  aws_iam,
  aws_kms,
  aws_lambda,
  aws_lambda_event_sources,
  aws_sns,
  aws_sns_subscriptions,
  aws_sqs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { envContext, stageContext } from '../shared/context-types';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stage = stageContext.check(this.node.tryGetContext('stage'));
    const context = envContext.check(this.node.tryGetContext(stage));

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

    const worker = new aws_lambda.Function(this, 'worker', {
      architecture: aws_lambda.Architecture.ARM_64,
      code: new aws_lambda.AssetCode('./lib'),
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      handler: 'app.handler',
      functionName: '<%- serviceName %>',
      environmentEncryption: kmsKey,
      environment: {
        // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        ...context.workerLambda.environment,
      },
    });

    worker.addEventSource(new aws_lambda_event_sources.SqsEventSource(queue));

    topic.addSubscription(new aws_sns_subscriptions.SqsSubscription(queue));
  }
}
