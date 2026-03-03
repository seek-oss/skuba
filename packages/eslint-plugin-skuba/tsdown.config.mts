import { defineConfig } from 'tsdown/config';

export default defineConfig({
  dts: true,
  entry: ['src/index.ts'],
  exports: {
    devExports: '@seek/skuba/source',
  },
  format: ['cjs', 'esm'],
  outDir: 'lib',
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: true,
});
