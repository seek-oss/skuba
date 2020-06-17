import { mergeWithIgnoreFile } from './ignoreFile';

describe('mergeWithIgnoreFile', () => {
  const baseTemplate =
    '# managed by skuba\nnode_modules\n# end managed by skuba';
  const updatedBaseTemplate =
    '# managed by skuba\nnode_modules\n.DS_Store\n# end managed by skuba';

  const cases = [
    ['empty provided', baseTemplate, ''],

    ['provided with no managed section', baseTemplate, '.DS_Store\n'],
    [
      'provided with outdated managed section',
      updatedBaseTemplate,
      `${baseTemplate}\n`,
    ],
    ['identical', baseTemplate, baseTemplate],
    [
      'provided with managed section and additional lines',
      baseTemplate,
      `.idea\n.vscode\n\n${baseTemplate}\n\n.DS_Store\nnode_modules\n`,
    ],
    [
      'provided with outdated managed section and additional lines',
      updatedBaseTemplate,
      `.idea\n.vscode\n\n${baseTemplate}\n\n.DS_Store\nnode_modules\n`,
    ],
  ] as const;

  test.each(cases)('%s', (_, base, provided) =>
    expect(mergeWithIgnoreFile(base)(provided)).toMatchSnapshot(),
  );
});
