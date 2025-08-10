import { Env } from 'skuba-dive';

interface Config {
  environment: Environment;

  logLevel: string;
  service: string;
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
    service: '<%- serviceName %>',
    version: 'local',

    metricsServer: null,
    port: null,
  }),

  test: () => ({
    logLevel: 'debug',
    service: '<%- serviceName %>',
    version: 'test',

    metricsServer: null,
    port: null,
  }),

  [dev]: () => ({
    ...configs[prod](),

    logLevel: 'debug',
    service: Env.string('DD_SERVICE'),
    version: Env.string('VERSION'),

    metricsServer: 'localhost',
    port: Env.nonNegativeInteger('PORT'),
  }),

  [prod]: () => ({
    logLevel: 'info',
    service: Env.string('DD_SERVICE'),
    version: Env.string('VERSION'),

    metricsServer: 'localhost',
    port: Env.nonNegativeInteger('PORT'),
  }),
};

export const config: Config = {
  ...configs[environment](),
  environment,
};
