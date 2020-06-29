import prettier from 'prettier';

import prettierConfig from '../../../../config/prettier';

type Options = Pick<prettier.Options, 'filepath' | 'parser'>;

export const formatPrettier = (source: string, options: Options) =>
  prettier.format(source, {
    ...options,
    ...prettierConfig,
  });
