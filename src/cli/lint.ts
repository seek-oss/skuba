import { execConcurrently } from '../utils/exec';

export const lint = () =>
  execConcurrently([
    {
      command: 'eslint --ext=js,ts,tsx .',
      name: 'ESLint',
    },
    {
      command: 'prettier --check .',
      name: 'Prettier',
    },
    {
      command: 'tsc --noEmit',
      name: 'tsc',
    },
  ]);
