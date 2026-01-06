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

const ONLY_BUILT_DEPENDENCIES = ['@ast-grep/lang-json'];

module.exports = {
  hooks: {
    /** @param {import("@pnpm/config").Config} config */
    updateConfig(config) {
      if (typeof config.publicHoistPattern === 'string') {
        config.publicHoistPattern = [config.publicHoistPattern];
      }
      config.publicHoistPattern ??= [];
      config.publicHoistPattern.push(...PUBLIC_HOIST_PATTERN);

      config.minimumReleaseAgeExclude ??= [];
      config.minimumReleaseAgeExclude.push(...MINIMUM_RELEASE_AGE_EXCLUDE);

      config.onlyBuiltDependencies ??= [];
      config.onlyBuiltDependencies.push(...ONLY_BUILT_DEPENDENCIES);

      config.packageManagerStrictVersion ??= true;
      config.minimumReleaseAge ??= 4320;
      config.ignorePatchFailures ??= false;

      return config;
    },
  },
};
