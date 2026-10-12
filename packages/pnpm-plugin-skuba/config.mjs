// @ts-check

/**
 * Settings that carry the same name and meaning across pnpm v10 and v11.
 *
 * Version-specific settings live in `pnpmfile.v10.mjs` and `pnpmfile.v11.mjs`.
 */

export const allowBuilds = {
  '@ast-grep/lang-bash': true,
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
};

export const minimumReleaseAge = 4320;

export const minimumReleaseAgeExclude = [
  '@seek/*',
  '@skuba-lib/*',
  'eslint-config-seek',
  'eslint-config-skuba',
  'eslint-plugin-skuba',
  'oxc-config-seek',
  'pnpm-plugin-skuba',
  'skuba',
  'skuba-dive',
  'tsconfig-seek',
];

export const publicHoistPattern = [
  '@arethetypeswrong/core',
  '@changesets/cli',
  '@eslint/*',
  '@skuba-lib/*',
  '@types*',
  '@vitest/*',
  'esbuild',
  'eslint',
  'eslint-config-skuba',
  'oxc-config-seek',
  'oxfmt',
  'publint',
  'rolldown',
  'tsconfig-seek',
  'tsdown',
  'typescript',
  'vitest',
];

export const trustPolicyExclude = ['semver@6.3.1']; // dependency of eslint-plugin-react

/**
 * Wraps a config in the shape pnpm expects of a pnpmfile.
 *
 * Existing consumer settings win: scalars are only filled in when unset, while
 * arrays and maps are merged into whatever the consumer already declared.
 *
 * @template {Record<string, unknown>} T
 * @param {T} defaultConfig
 */
export const createPnpmfile = (defaultConfig) => ({
  defaultConfig,
  hooks: {
    /** @param {import("@pnpm/config.reader").Config} config */
    updateConfig(config) {
      Object.entries(defaultConfig).forEach(([key, value]) => {
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
});
