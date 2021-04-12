import { AccountPrincipal } from '@aws-cdk/aws-iam';
import { Key } from '@aws-cdk/aws-kms';
import { AssetCode, Function, Runtime } from '@aws-cdk/aws-lambda';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { Topic } from '@aws-cdk/aws-sns';
import { SqsSubscription } from '@aws-cdk/aws-sns-subscriptions';
import { Queue } from '@aws-cdk/aws-sqs';
import { Construct, Stack, StackProps } from '@aws-cdk/core';

import { envContext, stageContext } from '../shared/context-types';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stage = stageContext.check(this.node.tryGetContext('stage'));
    const context = envContext.check(this.node.tryGetContext(stage));

    const accountPrincipal = new AccountPrincipal(this.account);

    const kmsKey = new Key(this, 'kms-key', {
      description: '<%- serviceName %>',
      enableKeyRotation: true,
      admins: [accountPrincipal],
      alias: 'seek/self/<%- serviceName %>',
    });

    kmsKey.grantEncrypt(accountPrincipal);

    const topic = new Topic(this, 'topic', {
      topicName: '<%- serviceName %>',
      masterKey: kmsKey,
    });

    const deadLetterQueue = new Queue(this, 'worker-queue-dlq', {
      queueName: '<%- serviceName %>-dlq',
      encryptionMasterKey: kmsKey,
    });

    const queue = new Queue(this, 'worker-queue', {
      queueName: '<%- serviceName %>',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      encryptionMasterKey: kmsKey,
    });

    const worker = new Function(this, 'worker', {
      code: new AssetCode('./lib'),
      runtime: Runtime.NODEJS_14_X,
      handler: 'app.handler',
      functionName: '<%- serviceName %>',
      environmentEncryption: kmsKey,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...context.workerLambda.environment,
      },
    });

    worker.addEventSource(new SqsEventSource(queue));

    topic.addSubscription(new SqsSubscription(queue));
  }
}
