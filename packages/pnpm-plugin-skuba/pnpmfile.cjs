// @ts-check
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

const PUBLIC_HOIST_PATTERN = [
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
];

const TRUST_POLICY_EXCLUDE = ['semver@5.7.2 || 6.3.1'];

module.exports = {
  hooks: {
    /** @param {import("@pnpm/config").Config} config */
    updateConfig(config) {
      config.allowBuilds ??= {};
      Object.assign(config.allowBuilds, ALLOWED_BUILDS);

      config.blockExoticSubdeps ??= true;

      config.ignorePatchFailures ??= false;

      config.packageManagerStrictVersion ??= true;

      if (typeof config.publicHoistPattern === 'string') {
        config.publicHoistPattern = [config.publicHoistPattern];
      }
      config.publicHoistPattern ??= [];
      config.publicHoistPattern.push(...PUBLIC_HOIST_PATTERN);

      config.minimumReleaseAge ??= 4320;
      config.minimumReleaseAgeExclude ??= [];
      config.minimumReleaseAgeExclude.push(...MINIMUM_RELEASE_AGE_EXCLUDE);

      config.strictDepBuilds ??= true;

      config.trustPolicy ??= 'no-downgrade';
      config.trustPolicyExclude ??= [];
      config.trustPolicyExclude.push(...TRUST_POLICY_EXCLUDE);

      return config;
    },
  },
};
