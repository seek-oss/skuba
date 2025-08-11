import { Env } from 'skuba-dive';

interface Config {
  environment: Environment;

  logLevel: string;
  name: string;
  version: string;

  metricsServer: string | null;
  port: number | null;
}

type Environment = (typeof environments)[number];

const dev = '<%- devGantryEnvironmentName %>';
const prod = '<%- prodGantryEnvironmentName %>';

const environments = ['local', 'test', dev, prod] as const;

const environment = Env.oneOf(environments)('ENVIRONMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Environment, () => Omit<Config, 'environment'>> = {
  local: () => ({
    logLevel: 'debug',
    name: '<%- serviceName %>',
    version: 'local',

    metricsServer: null,
    port: null,
  }),

  test: () => ({
    logLevel: Env.string('LOG_LEVEL', { default: 'silent' }),
    name: '<%- serviceName %>',
    version: 'test',

    metricsServer: null,
    port: null,
  }),

  [dev]: () => ({
    logLevel: 'debug',
    name: Env.string('SERVICE'),
    version: Env.string('VERSION'),

    metricsServer: 'localhost',
    port: Env.nonNegativeInteger('PORT'),
  }),

  [prod]: () => ({
    logLevel: 'info',
    name: Env.string('SERVICE'),
    version: Env.string('VERSION'),

    metricsServer: 'localhost',
    port: Env.nonNegativeInteger('PORT'),
  }),
};

export const config: Config = {
  ...configs[environment](),
  environment,
};
