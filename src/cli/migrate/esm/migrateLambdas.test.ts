import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { migrateLambdas } from './migrateLambdas.js';

vi.mock('../../../../../../utils/exec.js', () => ({
  createExec: () => vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
});

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('migrateLambdas', () => {
  it('should migrate the current CDK Lambda template', async () => {
    vol.fromJSON({
      'appStack.ts': `import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
import { DatadogLambda } from 'datadog-cdk-constructs-v2';

import { config } from './config.js';

// Updated by https://github.com/seek-oss/rynovate
const DATADOG_EXTENSION_LAYER_VERSION = 96;

// Updated by https://github.com/seek-oss/rynovate
const DATADOG_NODE_LAYER_VERSION = 126;

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
        retentionPeriod: Duration.days(14),
      },
    );

    const queue = new aws_sqs.Queue(this, 'worker-queue', {
      queueName: '<%- serviceName %>',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      encryptionMasterKey: kmsKey,
      retentionPeriod: Duration.days(14),
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
      runtime: aws_lambda.Runtime.NODEJS_24_X,
      memorySize: 512,
      environmentEncryption: kmsKey,
      // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
      // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: false,
      entry: './src/app.ts',
      timeout: Duration.seconds(30),
      bundling: {
        sourceMap: true,
        target: 'node24',
        // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
        externalModules: [],
        esbuildArgs: {
          '--conditions': '@seek/<%- serviceName %>/source',
        },
      },
      functionName: '<%- serviceName %>',
      environment: {
        ...config.workerLambda.environment,
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

        ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
          ? {
              SKIP_SMOKE: 'true',
            }
          : {}),
      },
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
    });

    destinationTopic.grantPublish(worker);

    const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
      this,
      'datadog-api-key-secret',
      {
        secretPartialArn: config.datadogApiKeySecretArn,
        // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
      },
    );

    const datadog = new DatadogLambda(this, 'datadog', {
      env: config.env,
      service: config.service,
      version: config.version,

      apiKeySecret: datadogSecret,
      enableDatadogLogs: false,
      extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
      flushMetricsToLogs: false,
      nodeLayerVersion: DATADOG_NODE_LAYER_VERSION,
    });

    datadog.addLambdaFunctions([worker]);

    const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
      lambdaFunction: worker,
    });

    workerDeployment.alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue, {
        batchSize: config.workerLambda.batchSize,
        maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
        reportBatchItemFailures: true,
      }),
    );
  }
}
`,
    });

    await expect(
      migrateLambdas({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "appStack.ts": "import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
      import { DatadogLambda } from 'datadog-cdk-constructs-v2';

      import { config } from './config.js';

      // Updated by https://github.com/seek-oss/rynovate
      const DATADOG_EXTENSION_LAYER_VERSION = 96;

      // Updated by https://github.com/seek-oss/rynovate
      const DATADOG_NODE_LAYER_VERSION = 126;

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
              retentionPeriod: Duration.days(14),
            },
          );

          const queue = new aws_sqs.Queue(this, 'worker-queue', {
            queueName: '<%- serviceName %>',
            deadLetterQueue: {
              maxReceiveCount: 3,
              queue: deadLetterQueue,
            },
            encryptionMasterKey: kmsKey,
            retentionPeriod: Duration.days(14),
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
            runtime: aws_lambda.Runtime.NODEJS_24_X,
            memorySize: 512,
            environmentEncryption: kmsKey,
            // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
            // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
            awsSdkConnectionReuse: false,
            entry: './src/app.ts',
            timeout: Duration.seconds(30),
            bundling: {
              sourceMap: true,
              target: 'node24',
              // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
              externalModules: [],
              esbuildArgs: {
                '--conditions': '@seek/<%- serviceName %>/source,module',
              },
            
      format: aws_lambda_nodejs.OutputFormat.ESM,

      mainFields: ['module', 'main'],

      nodeModules: ['pino'],
      },
            functionName: '<%- serviceName %>',
            environment: {
              ...config.workerLambda.environment,
              NODE_ENV: 'production',
              // https://nodejs.org/api/cli.html#cli_node_options_options
              NODE_OPTIONS: '--enable-source-maps',
              DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

              ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
                ? {
                    SKIP_SMOKE: 'true',
                  }
                : {}),
            },
            reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
          });

          destinationTopic.grantPublish(worker);

          const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
            this,
            'datadog-api-key-secret',
            {
              secretPartialArn: config.datadogApiKeySecretArn,
              // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
            },
          );

          const datadog = new DatadogLambda(this, 'datadog', {
            env: config.env,
            service: config.service,
            version: config.version,

            apiKeySecret: datadogSecret,
            enableDatadogLogs: false,
            extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
            flushMetricsToLogs: false,
            nodeLayerVersion: DATADOG_NODE_LAYER_VERSION,
          });

          datadog.addLambdaFunctions([worker]);

          const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
            lambdaFunction: worker,
          });

          workerDeployment.alias.addEventSource(
            new aws_lambda_event_sources.SqsEventSource(queue, {
              batchSize: config.workerLambda.batchSize,
              maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
              reportBatchItemFailures: true,
            }),
          );
        }
      }
      ",
      }
    `);
  });

  it('should migrate an older CDK Lambda template', async () => {
    vol.fromJSON({
      'other.ts': `
      import { datadog } from 'datadog-lambda-js';
`,
      'appStack.ts': `import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
import { DatadogLambda } from 'datadog-cdk-constructs-v2';

import { config } from './config.js';

// Updated by https://github.com/seek-oss/rynovate
const DATADOG_EXTENSION_LAYER_VERSION = 96;

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
        retentionPeriod: Duration.days(14),
      },
    );

    const queue = new aws_sqs.Queue(this, 'worker-queue', {
      queueName: '<%- serviceName %>',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      encryptionMasterKey: kmsKey,
      retentionPeriod: Duration.days(14),
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
      runtime: aws_lambda.Runtime.NODEJS_24_X,
      memorySize: 512,
      environmentEncryption: kmsKey,
      // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
      // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: false,
      entry: './src/app.ts',
      timeout: Duration.seconds(30),
      bundling: {
        sourceMap: true,
        target: 'node24',
        // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
        externalModules: [],
        nodeModules: ['datadog-lambda-js', 'dd-trace'],
        esbuildArgs: {
          '--conditions': '@seek/<%- serviceName %>/source',
        },
      },
      functionName: '<%- serviceName %>',
      environment: {
        ...config.workerLambda.environment,
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

        ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
          ? {
              SKIP_SMOKE: 'true',
            }
          : {}),
      },
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
    });

    destinationTopic.grantPublish(worker);

    const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
      this,
      'datadog-api-key-secret',
      {
        secretPartialArn: config.datadogApiKeySecretArn,
        // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
      },
    );

    const datadog = new DatadogLambda(this, 'datadog', {
      env: config.env,
      service: config.service,
      version: config.version,

      apiKeySecret: datadogSecret,
      enableDatadogLogs: false,
      extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
      flushMetricsToLogs: false,
    });

    datadog.addLambdaFunctions([worker]);

    const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
      lambdaFunction: worker,
    });

    workerDeployment.alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue, {
        batchSize: config.workerLambda.batchSize,
        maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
        reportBatchItemFailures: true,
      }),
    );
  }
}
`,
    });

    await expect(
      migrateLambdas({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "appStack.ts": "import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
      import { DatadogLambda } from 'datadog-cdk-constructs-v2';

      import { config } from './config.js';

      // Updated by https://github.com/seek-oss/rynovate
      const DATADOG_EXTENSION_LAYER_VERSION = 96;

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
              retentionPeriod: Duration.days(14),
            },
          );

          const queue = new aws_sqs.Queue(this, 'worker-queue', {
            queueName: '<%- serviceName %>',
            deadLetterQueue: {
              maxReceiveCount: 3,
              queue: deadLetterQueue,
            },
            encryptionMasterKey: kmsKey,
            retentionPeriod: Duration.days(14),
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
            runtime: aws_lambda.Runtime.NODEJS_24_X,
            memorySize: 512,
            environmentEncryption: kmsKey,
            // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
            // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
            awsSdkConnectionReuse: false,
            entry: './src/app.ts',
            timeout: Duration.seconds(30),
            bundling: {
              sourceMap: true,
              target: 'node24',
              // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
              externalModules: [],
              nodeModules: ['datadog-lambda-js', 'dd-trace', 'pino'],
              esbuildArgs: {
                '--conditions': '@seek/<%- serviceName %>/source,module',
              },
            
      format: aws_lambda_nodejs.OutputFormat.ESM,

      mainFields: ['module', 'main'],
      },
            functionName: '<%- serviceName %>',
            environment: {
              ...config.workerLambda.environment,
              NODE_ENV: 'production',
              // https://nodejs.org/api/cli.html#cli_node_options_options
              NODE_OPTIONS: '--enable-source-maps',
              DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

              ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
                ? {
                    SKIP_SMOKE: 'true',
                  }
                : {}),
            },
            reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
          });

          destinationTopic.grantPublish(worker);

          const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
            this,
            'datadog-api-key-secret',
            {
              secretPartialArn: config.datadogApiKeySecretArn,
              // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
            },
          );

          const datadog = new DatadogLambda(this, 'datadog', {
            env: config.env,
            service: config.service,
            version: config.version,

            apiKeySecret: datadogSecret,
            enableDatadogLogs: false,
            extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
            flushMetricsToLogs: false,
          
      redirectHandler: false,
      });

          datadog.addLambdaFunctions([worker]);

          const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
            lambdaFunction: worker,
          });

          workerDeployment.alias.addEventSource(
            new aws_lambda_event_sources.SqsEventSource(queue, {
              batchSize: config.workerLambda.batchSize,
              maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
              reportBatchItemFailures: true,
            }),
          );
        }
      }
      ",
        "other.ts": "
            import { datadog } from 'datadog-lambda-js';
      ",
      }
    `);
  });
  it('should migrate an alternate CDK Lambda template', async () => {
    vol.fromJSON({
      'appStack.ts': `import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
import { DatadogLambda } from 'datadog-cdk-constructs-v2';

import { config } from './config.js';

// Updated by https://github.com/seek-oss/rynovate
const DATADOG_EXTENSION_LAYER_VERSION = 96;

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
        retentionPeriod: Duration.days(14),
      },
    );

    const queue = new aws_sqs.Queue(this, 'worker-queue', {
      queueName: '<%- serviceName %>',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      encryptionMasterKey: kmsKey,
      retentionPeriod: Duration.days(14),
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
      runtime: aws_lambda.Runtime.NODEJS_24_X,
      memorySize: 512,
      environmentEncryption: kmsKey,
      // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
      // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
      awsSdkConnectionReuse: false,
      entry: './src/app.ts',
      timeout: Duration.seconds(30),
      bundling: {
        sourceMap: true,
        target: 'node24',
        // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
        externalModules: [],
      },
      functionName: '<%- serviceName %>',
      environment: {
        ...config.workerLambda.environment,
        NODE_ENV: 'production',
        // https://nodejs.org/api/cli.html#cli_node_options_options
        NODE_OPTIONS: '--enable-source-maps',
        DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

        ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
          ? {
              SKIP_SMOKE: 'true',
            }
          : {}),
      },
      reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
    });

    destinationTopic.grantPublish(worker);

    const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
      this,
      'datadog-api-key-secret',
      {
        secretPartialArn: config.datadogApiKeySecretArn,
        // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
      },
    );

    const datadog = new DatadogLambda(this, 'datadog', {
      env: config.env,
      service: config.service,
      version: config.version,

      apiKeySecret: datadogSecret,
      enableDatadogLogs: false,
      extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
      flushMetricsToLogs: false,
    });

    datadog.addLambdaFunctions([worker]);

    const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
      lambdaFunction: worker,
    });

    workerDeployment.alias.addEventSource(
      new aws_lambda_event_sources.SqsEventSource(queue, {
        batchSize: config.workerLambda.batchSize,
        maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
        reportBatchItemFailures: true,
      }),
    );
  }
}
`,
    });

    await expect(
      migrateLambdas({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "appStack.ts": "import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
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
      import { DatadogLambda } from 'datadog-cdk-constructs-v2';

      import { config } from './config.js';

      // Updated by https://github.com/seek-oss/rynovate
      const DATADOG_EXTENSION_LAYER_VERSION = 96;

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
              retentionPeriod: Duration.days(14),
            },
          );

          const queue = new aws_sqs.Queue(this, 'worker-queue', {
            queueName: '<%- serviceName %>',
            deadLetterQueue: {
              maxReceiveCount: 3,
              queue: deadLetterQueue,
            },
            encryptionMasterKey: kmsKey,
            retentionPeriod: Duration.days(14),
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
            runtime: aws_lambda.Runtime.NODEJS_24_X,
            memorySize: 512,
            environmentEncryption: kmsKey,
            // aws-sdk-v3 sets this to true by default, so it is not necessary to set the environment variable
            // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-reusing-connections.html
            awsSdkConnectionReuse: false,
            entry: './src/app.ts',
            timeout: Duration.seconds(30),
            bundling: {
              sourceMap: true,
              target: 'node24',
              // aws-sdk-v3 is set as an external module by default, but we want it to be bundled with the function
              externalModules: [],
            
      format: aws_lambda_nodejs.OutputFormat.ESM,

      mainFields: ['module', 'main'],

      nodeModules: ['pino'],

      esbuildArgs: {
        '--conditions': '@seek/skuba/source,module',
      },
      },
            functionName: '<%- serviceName %>',
            environment: {
              ...config.workerLambda.environment,
              NODE_ENV: 'production',
              // https://nodejs.org/api/cli.html#cli_node_options_options
              NODE_OPTIONS: '--enable-source-maps',
              DESTINATION_SNS_TOPIC_ARN: destinationTopic.topicArn,

              ...(containsSkipDirective(process.env.BUILDKITE_MESSAGE, 'smoke')
                ? {
                    SKIP_SMOKE: 'true',
                  }
                : {}),
            },
            reservedConcurrentExecutions: config.workerLambda.reservedConcurrency,
          });

          destinationTopic.grantPublish(worker);

          const datadogSecret = aws_secretsmanager.Secret.fromSecretAttributes(
            this,
            'datadog-api-key-secret',
            {
              secretPartialArn: config.datadogApiKeySecretArn,
              // encryptionKey: kmsKey, // Specify a KMS key if the secret is encrypted with one
            },
          );

          const datadog = new DatadogLambda(this, 'datadog', {
            env: config.env,
            service: config.service,
            version: config.version,

            apiKeySecret: datadogSecret,
            enableDatadogLogs: false,
            extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
            flushMetricsToLogs: false,
          });

          datadog.addLambdaFunctions([worker]);

          const workerDeployment = new LambdaDeployment(this, 'workerDeployment', {
            lambdaFunction: worker,
          });

          workerDeployment.alias.addEventSource(
            new aws_lambda_event_sources.SqsEventSource(queue, {
              batchSize: config.workerLambda.batchSize,
              maxConcurrency: config.workerLambda.reservedConcurrency - 1, // Ensure we have capacity reserved for our blue/green deployment
              reportBatchItemFailures: true,
            }),
          );
        }
      }
      ",
      }
    `);
  });

  it('should migrate serverless files', async () => {
    vol.fromJSON({
      'serverless.yml': `build:
  esbuild:
    bundle: true
    external:
      - 'foo'
plugins:
 - serverless-datadog-plugin
custom:
  datadog:
    addLayers: false
`,
    });

    await expect(
      migrateLambdas({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "serverless.yml": "build:
        esbuild:
          bundle: true
          external:
            - pino
            - 'foo'
          conditions:
            - module

          mainFields:
            - module
            - main

      plugins:
       - serverless-datadog-plugin
      custom:
        datadog:
          addLayers: false
      ",
      }
    `);
  });

  it('should migrate alternate serverless files', async () => {
    vol.fromJSON({
      'foo.ts': `import { datadog } from 'datadog-lambda-js';
`,
      'serverless.yml': `custom:
  esbuild:
    bundle: true
    external:
      - 'foo'
    conditions:
      - '@seek/skuba/source'
  datadog:
    addLayers: false
`,
    });

    await expect(
      migrateLambdas({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "foo.ts": "import { datadog } from 'datadog-lambda-js';
      ",
        "serverless.yml": "custom:
        esbuild:
          bundle: true
          external:
            - pino
            - 'foo'
          conditions:
            - '@seek/skuba/source'
            - module
          mainFields:
            - module
            - main

        datadog:
          addLayers: false

          redirectHandler: false
      ",
      }
    `);
  });
});
