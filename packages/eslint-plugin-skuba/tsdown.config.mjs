import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  exports: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
});
