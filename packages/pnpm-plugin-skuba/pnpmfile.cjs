// @ts-check

/**
 * @satisfies {Partial<import("@pnpm/config").Config>}
 */
const defaultConfig = {
  allowBuilds: {
    '@ast-grep/lang-json': true,
    '@ast-grep/lang-yaml': true,
    '@datadog/native-appsec': true,
    '@datadog/native-iast-taint-tracking': true,
    '@datadog/native-metrics': true,
    '@datadog/pprof': true,
    'dd-trace': true,
    esbuild: true,
    protobufjs: true,
    'unix-dgram': true,
    'unrs-resolver': true,
  },
  blockExoticSubdeps: true,
  ignorePatchFailures: false,

  minimumReleaseAge: 4320,
  minimumReleaseAgeExclude: [
    '@seek/*',
    '@skuba-lib/*',
    'eslint-config-seek',
    'eslint-config-skuba',
    'eslint-plugin-skuba',
    'skuba',
    'skuba-dive',
    'tsconfig-seek',
  ],

  packageManagerStrictVersion: true,
  publicHoistPattern: [
    '@arethetypeswrong/core',
    '@eslint/*',
    '@types*',
    'esbuild',
    'eslint',
    'eslint-config-skuba',
    'jest',
    'prettier',
    'publint',
    'tsconfig-seek',
    'tsdown',
    'typescript',
  ],
  strictDepBuilds: true,
  trustPolicy: 'no-downgrade',
  trustPolicyExclude: ['semver@5.7.2 || 6.3.1'],
};

module.exports = {
  defaultConfig,
  hooks: {
    /** @param {import("@pnpm/config").Config} config */
    updateConfig(config) {
      Object.entries(config).forEach(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          // @ts-ignore
          config[key] ??= value;
          return;
        }

        if (Array.isArray(value)) {
          // @ts-ignore
          config[key] ??= [];
          // @ts-ignore
          config[key].push(...value);
          return;
        }

        if (typeof value === 'object' && value !== null) {
          // @ts-ignore
          config[key] ??= {};
          // @ts-ignore
          Object.assign(config[key], value);
          return;
        }
      });
      return config;
    },
  },
};
