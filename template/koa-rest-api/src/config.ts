import { Env } from 'skuba-dive';

interface Config {
  environment: Environment;

  logLevel: string;
  name: string;
  region: string;
  version: string;

  metricsServer?: string;
  port?: number;
}

type Environment = typeof environments[number];

const environments = [
  'local',
  'test',
  '<%- devGantryEnvironmentName %>',
  '<%- prodGantryEnvironmentName %>',
] as const;

const environment = Env.oneOf(environments)('ENVIRONMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Environment, () => Omit<Config, 'environment'>> = {
  local: () => ({
    logLevel: 'debug',
    name: '<%- serviceName %>',
    region: 'ap-southeast-2',
    version: 'local',

    port: Env.nonNegativeInteger('PORT', { default: undefined }),
  }),

  test: () => ({
    ...configs.local(),

    logLevel: Env.string('LOG_LEVEL', { default: 'silent' }),
    version: 'test',
  }),

  '<%- devGantryEnvironmentName %>': () => ({
    ...configs['<%- prodGantryEnvironmentName %>'](),

    logLevel: 'debug',
  }),

  '<%- prodGantryEnvironmentName %>': () => ({
    logLevel: 'info',
    name: Env.string('SERVICE'),
    region: Env.string('REGION'),
    version: Env.string('VERSION'),

    metricsServer: 'localhost',
    port: Env.nonNegativeInteger('PORT'),
  }),
};

export const config: Config = {
  ...configs[environment](),
  environment,
};
