import { defineConfig } from 'tsdown/config';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outExtensions: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
    exports: true,
    format: ['esm'],
    outDir: 'lib',
    dts: true,
  },
  {
    exports: {
      bin: 'src/skuba.ts',
      exclude: ['!index'],
      customExports: {
        './config/eslint.js': './config/eslint.js',
        './config/prettier.js': './config/prettier.js',
        './config/tsconfig.json': './config/tsconfig.json',
      },
    },
    entry: [
      'src/skuba.ts',
      'src/cli/*/index.ts',
      'src/cli/init/getConfig.ts',
      'src/cli/lint/eslint.ts',
      'src/cli/lint/prettier.ts',
      'src/cli/lint/internalLints/upgrade/index.ts',
      'src/cli/lint/internalLints/upgrade/patches/**/index.ts',
      'src/utils/command.ts',
      'src/utils/help.ts',
      'src/utils/template.ts',
      'src/wrapper/index.ts',
    ],
    outExtensions: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
    format: ['esm'],
    outDir: 'lib',
    dts: false,
  },
]);
