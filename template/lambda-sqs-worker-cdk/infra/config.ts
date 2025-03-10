import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

type Environment = (typeof ENVIRONMENTS)[number];

const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');

interface Config {
  appName: string;
  workerLambda: {
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
      reservedConcurrency: 2,
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
