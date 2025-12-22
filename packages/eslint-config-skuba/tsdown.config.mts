import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['index.js'],
  exports: {
    devExports: '@seek/skuba/source',
  },
  format: ['cjs', 'esm'],
  outDir: 'lib',
  failOnWarn: false,
});
