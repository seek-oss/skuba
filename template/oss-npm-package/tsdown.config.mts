import { defineConfig } from 'tsdown/config';

export default defineConfig({
  
  failOnWarn: true,
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'lib',
  dts: true,
  checks: {
    legacyCjs: false,
  },
  exports: {
    devExports: '@seek/<%- moduleName %>/source',
  },
  publint: true,
  attw: true,
});
