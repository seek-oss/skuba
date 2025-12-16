import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  exports: {
    devExports: '@seek/skuba/source',
  },
  format: ['cjs', 'esm'],
  outDir: 'lib',
  failOnWarn: false,
});
