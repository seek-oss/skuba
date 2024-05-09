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
  SERVICE: string;
  VERSION: string;
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
    SERVICE: '<%- serviceName %>',
    VERSION: '<%- version %>',
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
    SERVICE: '<%- serviceName %>',
    VERSION: '<%- version %>',
  },
};

export const config: Config = configs[environment];
