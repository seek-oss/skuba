// @ts-check
module.exports = {
  hooks: {
    /** @param {import("@pnpm/types").PnpmSettings} config */
    updateConfig(config) {
      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.publicHoistPattern ??= [];
      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.publicHoistPattern.push(
        '@types*',
        'eslint',
        'eslint-config-skuba',
        'prettier',
        'esbuild',
        'jest',
        'tsconfig-seek',
        'typescript',
      );

      config.ignorePatchFailures = false;
      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.packageManagerStrictVersion = true;

      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.minimumReleaseAge = 4320 // 3 days
      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.minimumReleaseAgeExclude ??= []
      // @ts-expect-error Property isn't in PnpmSettings for some reason
      config.minimumReleaseAgeExclude.push('@seek/*')

      return config;
    },
  },
};
