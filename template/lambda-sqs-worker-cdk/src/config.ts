import { Env } from 'skuba-dive';

interface Config {
  environment: Environment;

  logLevel: string;
  name: string;
  version: string;
}

type Environment = (typeof environments)[number];

const dev = 'dev';
const prod = 'prod';

const environments = ['local', 'test', dev, prod] as const;

const environment = Env.oneOf(environments)('ENVIRONMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Environment, () => Omit<Config, 'environment'>> = {
  local: () => ({
    logLevel: 'debug',
    name: '<%- serviceName %>',
    version: 'local',
  }),

  test: () => ({
    ...configs.local(),

    logLevel: Env.string('LOG_LEVEL', { default: 'silent' }),
    version: 'test',
  }),

  [dev]: () => ({
    ...configs[prod](),

    logLevel: 'debug',
  }),

  [prod]: () => ({
    logLevel: 'info',
    name: Env.string('SERVICE'),
    version: Env.string('VERSION'),
  }),
};

export const config: Config = {
  ...configs[environment](),
  environment,
};
