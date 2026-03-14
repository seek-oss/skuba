import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  resolve: {
    // Required for node16/node20 moduleResolution where imports use
    // explicit .js extensions that map to .ts source files
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    },
  },
  output: {
    format: 'esm',
    sourcemap: true,
  },
});
