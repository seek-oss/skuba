import { execConcurrently } from '../utils/exec';

export const buildPackage = () =>
  execConcurrently([
    {
      command:
        'tsc --module CommonJS --outDir lib-commonjs --project tsconfig.build.json',
      name: 'commonjs',
      pnp: true,
    },
    {
      command:
        'tsc --module ES2015 --outDir lib-es2015 --project tsconfig.build.json',
      name: 'es2015',
      pnp: true,
    },
    {
      command:
        'tsc --allowJS false --declaration --emitDeclarationOnly --outDir lib-types --project tsconfig.build.json',
      name: 'types',
      pnp: true,
    },
  ]);
