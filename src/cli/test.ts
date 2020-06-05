import { run } from 'jest';

import { handleCliError } from '../utils/error';

const argv = process.argv.slice(2);

run(argv).catch(handleCliError);
