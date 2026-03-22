import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts', 'src/extensions.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'lib',
  exports: true,
  checks: {
    legacyCjs: false,
  },
  attw: {
    profile: 'node16',
  },
  publint: true,
});
