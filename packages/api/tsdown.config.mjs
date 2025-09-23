import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
});
