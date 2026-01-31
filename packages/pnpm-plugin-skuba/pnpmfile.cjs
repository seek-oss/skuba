// @ts-check
const MINIMUM_RELEASE_AGE_EXCLUDE = [
  '@seek/*',
  '@skuba-lib/*',
  'eslint-config-seek',
  'eslint-config-skuba',
  'eslint-plugin-skuba',
  'skuba',
  'skuba-dive',
  'tsconfig-seek',
];

const ONLY_BUILT_DEPENDENCIES = [
  '@ast-grep/lang-json',
  '@datadog/native-appsec',
  '@datadog/native-iast-taint-tracking',
  '@datadog/native-metrics',
  '@datadog/pprof',
  'dd-trace',
  'esbuild',
  'protobufjs',
  'unix-dgram',
  'unrs-resolver',
];

const PUBLIC_HOIST_PATTERN = [
  '@eslint/*',
  '@types*',
  'eslint',
  'eslint-config-skuba',
  'prettier',
  'esbuild',
  'jest',
  'tsconfig-seek',
  'typescript',
];

const TRUST_POLICY_EXCLUDE = [
  'pino@9.14.0', // https://github.com/seek-oss/skuba/pull/2180#discussion_r2618371672
  'semver@5.7.2 || 6.3.1',
  'undici-types@6.21.0', // https://github.com/nodejs/undici/issues/4666, required until our templates move to @types/node@24
];

module.exports = {
  hooks: {
    /** @param {import("@pnpm/config").Config} config */
    updateConfig(config) {
      if (typeof config.publicHoistPattern === 'string') {
        config.publicHoistPattern = [config.publicHoistPattern];
      }
      config.minimumReleaseAgeExclude ??= [];
      config.minimumReleaseAgeExclude.push(...MINIMUM_RELEASE_AGE_EXCLUDE);

      config.onlyBuiltDependencies ??= [];
      config.onlyBuiltDependencies.push(...ONLY_BUILT_DEPENDENCIES);

      config.publicHoistPattern ??= [];
      config.publicHoistPattern.push(...PUBLIC_HOIST_PATTERN);

      config.trustPolicyExclude ??= [];
      config.trustPolicyExclude.push(...TRUST_POLICY_EXCLUDE);

      config.ignorePatchFailures ??= false;
      config.minimumReleaseAge ??= 4320;
      config.packageManagerStrictVersion ??= true;
      config.strictDepBuilds ??= true;
      config.trustPolicy ??= 'no-downgrade';

      return config;
    },
  },
};
