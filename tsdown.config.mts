import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: [
    'src/skuba.ts',
    'src/index.ts',
    'src/cli/*/index.ts',
    'src/cli/test/reporters/github/index.ts',
  ],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  exports: {
    devExports: '@seek/skuba/source',
  },
  attw: true,
  failOnWarn: false,
  unbundle: true,
  copy: ['jest-preset.js', 'jest-preset.d.ts'],
});
