import { execConcurrently } from '../utils/exec';

export const lint = () =>
  execConcurrently([
    {
      command: 'eslint --ext=js,ts,tsx --report-unused-disable-directives .',
      name: 'ESLint',
      prefixColor: 'magenta',
    },
    {
      command: 'prettier --check .',
      name: 'Prettier',
      prefixColor: 'cyan',
    },
    {
      command: 'tsc --noEmit',
      name: 'tsc',
      prefixColor: 'blue',
    },
  ]);
