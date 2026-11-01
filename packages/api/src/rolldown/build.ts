import type { RolldownOptions } from 'rolldown';

export interface BuildOptions {
  /**
   * Directory to resolve each config's relative paths against, such as `input`
   * and `output.dir`.
   *
   * Overrides any `cwd` set in the configs. Defaults to each config's own `cwd`,
   * then `process.cwd()`.
   */
  cwd?: string;
}

/**
 * Builds and writes one or more rolldown configs, as returned by
 * `defineConfig`.
 *
 * `defineConfig` widens `output` to `OutputOptions | OutputOptions[]`, which
 * rolldown's own `build` does not accept. This bundles each config once and
 * writes it to each of its outputs, as the rolldown CLI does, so a config file
 * can be passed straight through without a cast.
 *
 * Configs are built in parallel. Function configs are not supported.
 *
 * @example
 * ```ts
 * import { Rolldown } from 'skuba';
 *
 * import config from '../rolldown.config.js';
 *
 * beforeAll(() => Rolldown.build(config));
 * ```
 */
export const build = async (
  config: RolldownOptions | RolldownOptions[],
  { cwd }: BuildOptions = {},
): Promise<void> => {
  // `rolldown` is an optional peer dependency. Load it on demand so that
  // importing `@skuba-lib/api` does not require it.
  const { rolldown } = await import('rolldown');

  await Promise.all(
    [config].flat().map(async ({ output, ...input }) => {
      const bundle = await rolldown({ ...input, ...(cwd && { cwd }) });

      try {
        // Write outputs one at a time from a single bundle. Plugins such as
        // `lambdaAsset` keep per-build state that parallel builds sharing the
        // same plugin instance would clobber.
        for (const outputOptions of [output ?? {}].flat()) {
          await bundle.write(outputOptions);
        }
      } finally {
        await bundle.close();
      }
    }),
  );
};
