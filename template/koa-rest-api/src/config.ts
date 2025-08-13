import { Env } from 'skuba-dive';

interface Config {
  deployment: Deployment;

  logLevel: string;
  name: string;
  version: string;

  metricsServer: string | null;
  port: number | null;
}

type Deployment = (typeof deployments)[number];

const dev = '<%- devGantryEnvironmentName %>';
const prod = '<%- prodGantryEnvironmentName %>';

const deployments = ['local', 'test', dev, prod] as const;

const deployment = Env.oneOf(deployments)('DEPLOYMENT');

/* istanbul ignore next: config verification makes more sense in a smoke test */
const configs: Record<Deployment, () => Omit<Config, 'deployment'>> = {
  local: () => ({
    logLevel: 'debug',
    name: '<%- serviceName %>',
    version: 'local',

    metricsServer: null,
    port: null,
  }),

  test: () => ({
    logLevel: 'debug',
    name: '<%- serviceName %>',
    version: 'test',

    metricsServer: null,
    port: null,
  }),

  [dev]: () => ({
    ...configs[prod](),

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
  ...configs[deployment](),
  deployment,
};
