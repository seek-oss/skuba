import { mergeWithIgnoreFile } from './ignoreFile';

describe('mergeWithIgnoreFile', () => {
  const cases = [
    ['difference', 'node_modules', '.DS_Store'],
    ['empty', '', ''],
    ['empty base', '', 'node_modules'],
    ['empty provided', 'node_modules', ''],
    ['identical', 'node_modules', 'node_modules'],
    ['mix', '.DS_Store\n\nyarn-error.log', '\n\n.DS_Store\n\nnode_modules'],
    [
      'whitespace',
      '\n   \n  node_modules  \n\n \n  ',
      '\n  \n   .DS_Store\n\n  ',
    ],
  ] as const;

  test.each(cases)('%s', (_, base, provided) =>
    expect(mergeWithIgnoreFile(base)(provided)).toMatchSnapshot(),
  );
});
