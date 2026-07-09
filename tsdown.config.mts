import { defineConfig } from 'tsdown/config';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    exports: true,
    format: ['esm'],
    outDir: 'lib',
    dts: true,
  },
  {
    entry: [
      'src/skuba.ts',
      'src/cli/*/index.ts',
      'src/cli/lint/eslint.ts',
      'src/cli/lint/prettier.ts',
      'src/cli/lint/internalLints/upgrade/index.ts',
      'src/cli/lint/internalLints/upgrade/patches/**/index.ts',
      'src/utils/template.ts',
      'src/utils/command.ts',
      'src/wrapper/index.ts',
    ],
    format: ['esm'],
    outDir: 'lib',
    dts: false
  },
]);
