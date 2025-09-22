// @ts-check
module.exports = {
  hooks: {
    /** @param {import("@pnpm/types").PnpmSettings & {
     * publicHoistPattern?: (string | RegExp)[],
     * ignorePatchFailures?: boolean,
     * packageManagerStrictVersion?: boolean,
     * minimumReleaseAge?: number,
     * minimumReleaseAgeExclude?: string[],
     *
    }} config */
    updateConfig(config) {
      config.publicHoistPattern ??= [
        '@types*',
        'eslint',
        'eslint-config-skuba',
        'prettier',
        'esbuild',
        'jest',
        'tsconfig-seek',
        'typescript',
      ];

      config.ignorePatchFailures ??= false;
      config.packageManagerStrictVersion ??= true;

      config.minimumReleaseAge ??= 4320; // 3 days
      config.minimumReleaseAgeExclude ??= ['@seek/*'];

      return config;
    },
  },
};
