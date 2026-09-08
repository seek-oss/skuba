import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts', 'src/inject.ts'],
  dts: true,
  format: ['esm'],
  outDir: 'lib',
  exports: {
    devExports: '@seek/skuba/source',
    bin: {
      'skuba-changelog-inject': './src/inject.ts',
    },
  },
  checks: {
    legacyCjs: false,
  },
  attw: {
    profile: 'esm-only',
  },
  publint: true,
});
