import { Env } from 'skuba-dive';

interface Config {
  deployment: Deployment;

  logLevel: string;
  metrics: boolean;
  name: string;
  version: string;

  destinationSnsTopicArn: string;
}

type Deployment = (typeof deployments)[number];

const deployments = ['local', 'test', 'dev', 'prod'] as const;

const deployment = Env.oneOf(deployments)('DEPLOYMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Deployment, () => Omit<Config, 'deployment'>> = {
  local: () => ({
    logLevel: 'debug',
    metrics: false,
    name: '<%- serviceName %>',
    version: 'local',

    destinationSnsTopicArn: 'arn:aws:sns:us-east-2:123456789012:destination',
  }),

  test: () => ({
    logLevel: Env.string('LOG_LEVEL', { default: 'debug' }),
    metrics: false,
    name: '<%- serviceName %>',
    version: 'test',

    destinationSnsTopicArn: 'arn:aws:sns:us-east-2:123456789012:destination',
  }),

  dev: () => ({
    logLevel: 'debug',
    metrics: true,
    name: Env.string('DD_SERVICE'),
    version: Env.string('DD_VERSION'),

    destinationSnsTopicArn: Env.string('DESTINATION_SNS_TOPIC_ARN'),
  }),

  prod: () => ({
    logLevel: 'info',
    metrics: true,
    name: Env.string('DD_SERVICE'),
    version: Env.string('DD_VERSION'),

    destinationSnsTopicArn: Env.string('DESTINATION_SNS_TOPIC_ARN'),
  }),
};

export const config: Config = {
  ...configs[deployment](),
  deployment,
};
