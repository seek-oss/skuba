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

const ALLOWED_BUILDS = {
  '@ast-grep/lang-json': true,
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

      config.allowBuilds ??= {};
      Object.assign(config.allowBuilds, ALLOWED_BUILDS);

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
