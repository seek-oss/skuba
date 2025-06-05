import type prettier from 'prettier';

import prettierConfig from '../../../../config/prettier';

type Options = Pick<prettier.Options, 'filepath' | 'parser'>;

export const formatPrettier = async (source: string, options: Options) => {
  const prettier = await import('prettier');
  return prettier.format(source, {
    ...options,
    ...prettierConfig,
  });
};
