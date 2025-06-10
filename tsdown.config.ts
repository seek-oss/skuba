import { defineConfig } from 'tsdown';

export default defineConfig({
  platform: 'node',
  format: ['cjs', 'esm'],
  dts: true,
  entry: ['src/index.ts', 'src/skuba.ts'],
  unbundle: true,
});
