import path from 'path';

import { build } from 'esbuild';

import { crawlDirectory } from '../../utils/dir';

const SUPPORTED_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);

export const esbuild = async () => {
  // TODO: support `--project` option
  const tsconfig = 'tsconfig.build.json';

  // TODO: read actual `tsconfig.json`
  const config = {
    compilerOptions: {
      declaration: true,
      outDir: 'lib',
    },
    include: ['src/**/*'],
  };

  // TODO: translate `tsconfig.json#/include`
  const allFiles = await crawlDirectory(path.join(process.cwd(), 'src'));

  const files = allFiles.filter((file) =>
    SUPPORTED_FILE_EXTENSIONS.has(path.extname(file)),
  );

  const buildResult = await build({
    // TODO: make these configurable
    bundle: false,
    sourcemap: true,

    entryPoints: files,
    outdir: config.compilerOptions.outDir,
    tsconfig,
  });

  if (buildResult.errors.length) {
    process.exitCode = 1;
  }

  if (config.compilerOptions.declaration) {
    const { tsc } = await import('./tsc');

    await tsc(['--declaration', '--emitDeclarationOnly']);
  }
};
