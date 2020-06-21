import { exec } from '../../utils/exec';

// TODO: we have a couple of options here:
// 1. Parse tsconfig.build.json to determine babel dirs
// 2. Define our own config and generate the corresponding babel/tsc dirs
export const babel = () =>
  exec(
    'babel',
    '--extensions',
    ['.js', '.ts'].join(','),
    '--out-dir',
    'lib',
    '--source-maps',
    'src',
  );
