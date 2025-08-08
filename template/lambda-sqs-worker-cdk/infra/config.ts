import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

type Environment = (typeof ENVIRONMENTS)[number];

const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');

interface Config {
  appName: string;
  workerLambda: {
    batchSize: number;
    reservedConcurrency: number;
    environment: {
      ENVIRONMENT: Environment;
      SERVICE: string;
      VERSION: string;
    };
  };
  datadogApiKeySecretArn: string;
  sourceSnsTopicArn: string;
}

const configs: Record<Environment, Config> = {
  dev: {
    appName: '<%- serviceName %>',
    workerLambda: {
      batchSize: 10,
      reservedConcurrency: 3,
      environment: {
        ENVIRONMENT: 'dev',
        SERVICE: '<%- serviceName %>',
        VERSION: Env.string('VERSION', { default: 'local' }),
      },
    },
    datadogApiKeySecretArn: 'TODO: datadogApiKeySecretArn',
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
  prod: {
    appName: '<%- serviceName %>',
    workerLambda: {
      batchSize: 10,
      reservedConcurrency: 20,
      environment: {
        ENVIRONMENT: 'prod',
        SERVICE: '<%- serviceName %>',
        VERSION: Env.string('VERSION', { default: 'local' }),
      },
    },
    datadogApiKeySecretArn: 'TODO: datadogApiKeySecretArn',
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config: Config = configs[environment];
