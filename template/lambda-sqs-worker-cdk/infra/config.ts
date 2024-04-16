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
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
  prod: {
    appName: '<%- serviceName %>',
    workerLambda: {
      reservedConcurrency: 10,
      environment: {
        ENVIRONMENT: 'prod',
      },
    },
    sourceSnsTopicArn: 'TODO: sourceSnsTopicArn',
  },
};

export const config = configs[environment];
