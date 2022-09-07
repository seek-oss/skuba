import { Env } from 'skuba-dive';

interface Config {
  environment: Environment;

  logLevel: string;
  metrics: boolean;
  name: string;
  version: string;

  destinationSnsTopicArn: string;
}

type Environment = typeof environments[number];

const environments = ['local', 'test', 'dev', 'prod'] as const;

const environment = Env.oneOf(environments)('ENVIRONMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Environment, () => Omit<Config, 'environment'>> = {
  local: () => ({
    logLevel: 'debug',
    metrics: false,
    name: '<%- serviceName %>',
    version: 'local',

    destinationSnsTopicArn: 'arn:aws:sns:us-east-2:123456789012:destination',
  }),

  test: () => ({
    ...configs.local(),

    logLevel: Env.string('LOG_LEVEL', { default: 'silent' }),
    version: 'test',
  }),

  dev: () => ({
    ...configs.prod(),

    logLevel: 'debug',
  }),

  prod: () => ({
    logLevel: 'info',
    metrics: true,
    name: Env.string('SERVICE'),
    version: Env.string('VERSION'),

    destinationSnsTopicArn: Env.string('DESTINATION_SNS_TOPIC_ARN'),
  }),
};

export const config: Config = {
  ...configs[environment](),
  environment,
};
