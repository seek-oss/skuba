import { z } from 'zod';

const environment = z.enum(['dev', 'prod']).parse(process.env.ENVIRONMENT);

type Environment = typeof environment;

export interface Config {
  appName: string;
  workerLambda: {
    reservedConcurrency: number;
    environment: {
      ENVIRONMENT: Environment;
    };
    SERVICE: string;
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
      },
      SERVICE: '<%- serviceName %>',
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
  prod: {
    appName: '<%- serviceName %>',
    workerLambda: {
      reservedConcurrency: 20,
      environment: {
        ENVIRONMENT: 'prod',
      },
      SERVICE: '<%- serviceName %>',
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config: Config = configs[environment];
