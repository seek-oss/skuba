import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts', 'src/inject.mjs'],
  dts: true,
  format: ['esm'],
  outDir: 'lib',
  exports: {
    devExports: '@seek/skuba/source',
  },
  checks: {
    legacyCjs: false,
  },
  attw: {
    profile: 'esm-only',
  },
  publint: true,
});
