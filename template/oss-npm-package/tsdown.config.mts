import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'lib',
  dts: true,
  inputOptions: {
    resolve: {
      conditionNames: ['@seek/<%- repoName %>/source'],
    },
  },
  checks: {
    legacyCjs: false,
  },
  exports: {
    devExports: '@seek/<%- repoName %>/source',
  },
  publint: true,
  attw: true,
});
