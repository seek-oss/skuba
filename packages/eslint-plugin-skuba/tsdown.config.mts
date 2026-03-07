import { defineConfig } from 'tsdown/config';

export default defineConfig({
  dts: true,
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: true,
});
