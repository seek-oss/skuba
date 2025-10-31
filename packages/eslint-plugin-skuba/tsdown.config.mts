import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
});
