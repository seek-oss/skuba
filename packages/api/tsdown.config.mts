import { defineConfig } from 'tsdown/config';

export default defineConfig([
  {
    deps: {
      onlyBundle: false,
    },
    failOnWarn: true,
    entry: [
      'src/index.ts',
      'src/*/index.ts',
      'src/cdk/nodejsFunction/index.ts',
    ],
    dts: true,
    format: ['esm'],
    outDir: 'lib',
    exports: {
      devExports: '@seek/skuba/source',
    },
    checks: {
      legacyCjs: false,
    },
    attw: { profile: 'esm-only' },
    publint: true,
  },
  {
    failOnWarn: true,
    entry: ['src/cdk/nodejsFunction/bridges/rolldown.mts'],
    outDir: 'lib/cdk/bridges',
    format: ['esm'],
    dts: false,
  },
]);
