import { Env } from 'skuba-dive';

type Deployment = (typeof deployments)[number];

const deployments = ['dev', 'prod'] as const;

const deployment = Env.oneOf(deployments)('DEPLOYMENT');

interface Config {
  env: 'development' | 'production';
  service: string;
  version: string;

  workerLambda: {
    batchSize: number;
    reservedConcurrency: number;
    environment: {
      DEPLOYMENT: Deployment;
    };
  };

  datadogApiKeySecretArn: string;
  sourceSnsTopicArn: string;
}

const service = '<%- serviceName %>';
const version = Env.string('VERSION');

const configs: Record<Deployment, Config> = {
  dev: {
    env: 'development',
    service,
    version,

    workerLambda: {
      batchSize: 10,
      reservedConcurrency: 3,
      environment: {
        DEPLOYMENT: 'dev',
      },
    },

    datadogApiKeySecretArn: '<%- devDataDogApiKeySecretArn %>',
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
        DEPLOYMENT: 'prod',
      },
    },

    datadogApiKeySecretArn: '<%- prodDataDogApiKeySecretArn %>',
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config: Config = configs[deployment];
