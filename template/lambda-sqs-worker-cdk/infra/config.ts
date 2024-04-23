import { Env } from 'skuba-dive';

export interface Config {
  appName: string;
  workerLambda: {
    reservedConcurrency: number;
    environment: {
      ENVIRONMENT: Environment;
    };
  };
  version: string;
  sourceSnsTopicArn: string;
}

type Environment = typeof environment;

const environments = ['dev', 'prod'] as const;

const environment = Env.oneOf(environments).parse(process.env.ENVIRONMENT);

export const configs: Record<Environment, Config> = {
  dev: {
    appName: '<%- serviceName %>',
    workerLambda: {
      reservedConcurrency: 2,
      environment: {
        ENVIRONMENT: 'dev',
      },
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
    version: Env.string('VERSION'),
  },
  prod: {
    appName: '<%- serviceName %>',
    workerLambda: {
      reservedConcurrency: 20,
      environment: {
        ENVIRONMENT: 'prod',
      },
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
    version: Env.string('VERSION'),
  },
};

export const config = configs[environment];
