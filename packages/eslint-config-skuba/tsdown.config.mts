import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  dts: true,
  entry: ['src/index.ts', 'src/extensions.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: {
    profile: 'node16',
  },
  exports: true,
});
