import { execConcurrently } from '../utils/exec.js';

export const buildPackage = () =>
  execConcurrently([
    {
      command:
        'tsc --module CommonJS --outDir lib-commonjs --project tsconfig.build.json',
      name: 'commonjs',
      prefixColor: 'green',
    },
    {
      command:
        'tsc --module ES2015 --outDir lib-es2015 --project tsconfig.build.json',
      name: 'es2015',
      prefixColor: 'yellow',
    },
    {
      command:
        'tsc --allowJS false --declaration --emitDeclarationOnly --outDir lib-types --project tsconfig.build.json',
      name: 'types',
      prefixColor: 'blue',
    },
  ]);
