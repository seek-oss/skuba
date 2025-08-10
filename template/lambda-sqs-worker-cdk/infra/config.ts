import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

type Environment = (typeof ENVIRONMENTS)[number];

const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');

interface Config {
  env: 'development' | 'production';
  service: string;
  version: string;

  workerLambda: {
    batchSize: number;
    reservedConcurrency: number;
    environment: {
      ENVIRONMENT: Environment;
    };
  };

  datadogApiKeySecretArn: string;
  sourceSnsTopicArn: string;
}

const service = '<%- serviceName %>';
const version = Env.string('VERSION');

const configs: Record<Environment, Config> = {
  dev: {
    env: 'development',
    service,
    version,

    workerLambda: {
      batchSize: 10,
      reservedConcurrency: 3,
      environment: {
        ENVIRONMENT: 'dev',
      },
    },

    datadogApiKeySecretArn: 'TODO: datadogApiKeySecretArn',
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
  prod: {
    env: 'production',
    service,
    version,

    workerLambda: {
      batchSize: 10,
      reservedConcurrency: 20,
      environment: {
        ENVIRONMENT: 'prod',
      },
    },

    datadogApiKeySecretArn: 'TODO: datadogApiKeySecretArn',
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config: Config = configs[environment];
