import { z } from 'zod';

export const ProjectType = z.enum(['application', 'package', 'root']);
export type ProjectType = z.infer<typeof ProjectType>;

export const BuildTool = z.enum(['esbuild', 'tsc']);
export type BuildTool = z.infer<typeof BuildTool>;

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

  buildTool: {
    /**
     * The default build tool for applications.
     */
    default: 'tsc' as const,
  },

  entryPoint: {
    /**
     * The default entry point for applications.
     */
    default: 'src/app.ts',
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
   * The build tool to use for compiling TypeScript code.
   *
   * Commands:
   * - `skuba build`
   * - `skuba build-package`
   *
   * @link https://seek-oss.github.io/skuba/docs/deep-dives/esbuild.html
   */
  buildTool: BuildTool.optional().default(SkubaConfig.buildTool.default),

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
   * The project type.
   */
  projectType: ProjectType.optional(),

  /**
   * The template used in `skuba init`.
   * This only has documentation value, except for running `skuba configure`.
   */
  template: z.string().optional(),
});

export type SkubaConfig = z.input<typeof skubaConfigSchema>;

export const skubaConfigDefault = skubaConfigSchema.parse({});
