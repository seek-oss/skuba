import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts', 'src/*/index.ts'],
  dts: true,
  exports: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
});
