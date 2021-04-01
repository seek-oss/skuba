require('esbuild')
  .build({
    entryPoints: ['./src/app.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    target: ['node14.16.0'],
    outdir: './dist',
  })
  .catch((e) => {
    throw new Error(e);
  });
