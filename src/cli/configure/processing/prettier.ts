import prettier from 'prettier';

import prettierConfig from '../../../../config/prettier.js';

type Options = Pick<prettier.Options, 'filepath' | 'parser'>;

export const formatPrettier = (source: string, options: Options) =>
  prettier.format(source, {
    ...options,
    ...prettierConfig,
  });
