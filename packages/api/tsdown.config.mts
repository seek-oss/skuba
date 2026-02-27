import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts', 'src/*/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  exports: {
    devExports: '@seek/skuba/source',
  },
  inlineOnly: false,
  checks: {
    legacyCjs: false,
  },
});
