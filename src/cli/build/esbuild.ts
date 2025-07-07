import path from 'path';
import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';
import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { buildPatternToFilepathMap, crawlDirectory } from '../../utils/dir';
import { createLogger } from '../../utils/logging';
import { getEntryPointFromManifest } from '../../utils/manifest';

import { parseTscArgs } from './args';
import { readTsconfig, tsc } from './tsc';

interface EsbuildParameters {
  debug: boolean;
}

export const esbuild = async (
  { debug }: EsbuildParameters,
  args = process.argv.slice(2),
) => {
  const log = createLogger({ debug });

  const tscArgs = parseTscArgs(args);

  if (tscArgs.build) {
    log.err(
      'skuba does not currently support the tsc --build flag with esbuild',
    );
    process.exitCode = 1;
    return;
  }

  const parsedCommandLine = readTsconfig(args, log);

  if (!parsedCommandLine || process.exitCode) {
    return;
  }

  const { options: compilerOptions } = parsedCommandLine;

  const entryPoint = await getEntryPointFromManifest();
  if (!entryPoint) {
    return;
  }

  const pathSegments = entryPoint.split(path.sep);
  const srcDir = pathSegments.length > 1 ? pathSegments[0] : '';
  const resolvedSrcDir = path.resolve(tscArgs.dirname, srcDir);

  const allFiles = await crawlDirectory(resolvedSrcDir);
  // TODO: use extensions from eslint-config-seek
  const tsExtensions = ['ts', 'tsx', 'cts', 'mts'];
  const filesByPattern = buildPatternToFilepathMap(
    [
      `**/*.@(${tsExtensions.join('|')})`,
      // Must be explicit about including dotfiles otherwise TypeScript ignores them
      // https://github.com/microsoft/TypeScript/blob/v5.0.4/src/compiler/utilities.ts#L8828-L8830
      `**/.*.@(${tsExtensions.join('|')})`,
      `**/.*/**/*.@(${tsExtensions.join('|')})`,
      `**/.*/**/.*.@(${tsExtensions.join('|')})`,
    ],
    allFiles,
    {
      cwd: resolvedSrcDir,
      dot: true,
      ignore: [
        '**/*.d.ts',
        // TODO: use `exclude` from tsconfig
        '**/__mocks__/**/*',
        '**/*.test.ts',
        'src/testing/**/*',
      ],
    },
  );

  const entryPoints = Array.from(
    new Set(Object.values(filesByPattern).flat()),
  ).map((filename) => path.resolve(resolvedSrcDir, filename));

  log.debug(log.bold('Compiler options'));
  log.debug(inspect(compilerOptions));

  const start = process.hrtime.bigint();

  // TODO: support `bundle`, `minify`, `splitting`, `treeShaking`
  const bundle = false;

  await build({
    bundle,
    entryPoints,
    format: compilerOptions.module === ModuleKind.CommonJS ? 'cjs' : undefined,
    outdir: compilerOptions.outDir,
    logLevel: debug ? 'debug' : 'info',
    logLimit: 0,
    platform:
      compilerOptions.moduleResolution === ModuleResolutionKind.NodeJs
        ? 'node'
        : undefined,
    plugins: bundle
      ? []
      : [
          // evanw/esbuild#394
          tsconfigPaths({
            tsconfig: { baseUrl: compilerOptions.baseUrl, compilerOptions },
          }),
        ],
    sourcemap: compilerOptions.sourceMap,
    // TODO: as of 0.18, the esbuild CLI no longer infers the target property to
    // avoid ambiguity where multiple `tsconfig.json`s are involved in a build.
    // This would be unusual for a typical SEEK project but we can still explore
    // an explicit setting once we implement `skuba.config.ts` (#1167).
    target: compilerOptions.target
      ? ScriptTarget[compilerOptions.target].toLocaleLowerCase()
      : undefined,
    tsconfig: tscArgs.pathname,
  });

  const end = process.hrtime.bigint();

  log.plain(`Built in ${log.timing(start, end)}.`);

  if (compilerOptions.declaration) {
    await tsc([
      '--declaration',
      '--emitDeclarationOnly',
      ...(tscArgs.project ? ['--project', tscArgs.project] : []),
    ]);
  }
};
