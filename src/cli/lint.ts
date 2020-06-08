import { execConcurrently } from '../utils/exec';

export const lint = () =>
  execConcurrently([
    {
      command: 'eslint --ext=js,ts .',
      name: 'ESLint  ',
      pnp: true,
    },
    {
      command: 'prettier --check .',
      name: 'Prettier',
      pnp: true,
    },
    {
      command: 'tsc --incremental false --noEmit',
      name: 'tsc     ',
      pnp: true,
    },
  ]);
