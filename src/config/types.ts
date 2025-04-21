import { z } from 'zod';

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

  entryPoint: {
    /**
     * The default entry point for applications.
     */
    default: 'src/app.ts',
  },

  buildTool: {
    /**
     * The default build tool for applications.
     */
    default: 'tsc' as const,
  },
};

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
  assets: z.array(z.string()).optional().default(SkubaConfig.assets.default),

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
  entryPoint: z.string().optional().default(SkubaConfig.entryPoint.default),

  /**
   * The build tool to use for compiling TypeScript code.
   *
   * @link https://seek-oss.github.io/skuba/docs/deep-dives/esbuild.html
   */
  buildTool: z
    .enum(['esbuild', 'tsc'])
    .optional()
    .default(SkubaConfig.buildTool.default),
});

export type SkubaConfig = z.input<typeof skubaConfigSchema>;
export type LoadedSkubaConfig = z.output<typeof skubaConfigSchema>;

export const skubaConfigDefault = skubaConfigSchema.parse({});
