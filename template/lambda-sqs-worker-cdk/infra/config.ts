import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');

export interface Config {
  appName: string;
  workerLambda: {
    reservedConcurrency: number;
    environment: {
      ENVIRONMENT: Environment;
      SERVICE: string;
      VERSION: string;
    };
  };
  sourceSnsTopicArn: string;
}

export const configs: Record<Environment, Config> = {
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
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config: Config = configs[environment];
