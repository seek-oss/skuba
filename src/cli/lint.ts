import { handleCliError } from '../utils/error';
import { execConcurrently } from '../utils/exec';

const lint = () =>
  execConcurrently([
    {
      command: 'eslint --ext=js,ts .',
      name: 'ESLint  ',
    },
    {
      command: 'prettier --check .',
      name: 'Prettier',
    },
    {
      command: 'tsc --incremental false --noEmit',
      name: 'tsc     ',
    },
  ]);

lint().catch(handleCliError);
