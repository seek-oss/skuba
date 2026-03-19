import { defineConfig } from 'tsdown/config';

export default defineConfig({
  deps: {
    onlyBundle: false,
  },
  inlineOnly: false,
  failOnWarn: true,
  entry: ['src/index.ts', 'src/*/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  exports: {
    devExports: '@seek/skuba/source',
  },
  checks: {
    legacyCjs: false,
  },
  attw: true,
  publint: true,
});
