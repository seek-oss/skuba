import { z } from 'zod';

export const skubaConfigSchema = z.object({
  /**
   * Files to copy from the working directory to the output directory after
   * compilation. This feature is useful to bundle non-JavaScript assets in an
   * npm package, back-end deployment package or container image.
   *
   * Supports `picomatch` glob patterns with dotfile matching.
   *
   * - https://github.com/micromatch/picomatch#globbing-features
   * - https://github.com/micromatch/picomatch#picomatch-options
   *
   * Commands:
   *
   * - `skuba build`
   * - `skuba build-package`
   */
  assets: z.array(z.string()).optional(),

  /**
   * The entry point to the package or application. For packages, this is the
   * main file that will be imported when the package is required. For applications,
   * this is the main file that will be executed when the application is run.
   *
   * Commands:
   *
   * - `skuba build`
   * - `skuba build-package`
   * - `skuba start`
   */
  entryPoint: z.string().optional(),
});

export const SkubaConfig = {
  assets: {
    /**
     * The default list of `assets` that are applied if your project does not
     * specify the configuration property.
     *
     * Currently includes:
     *
     * - JSON translation files for https://github.com/seek-oss/vocab
     */
    default: ['**/*.vocab/*translations.json'],
  },
};

export type SkubaConfig = z.infer<typeof skubaConfigSchema>;
