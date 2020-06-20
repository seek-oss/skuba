import { mergeWithIgnoreFile } from './ignoreFile';

describe('mergeWithIgnoreFile', () => {
  const baseTemplate =
    '# managed by skuba\nnode_modules\n# end managed by skuba\n';
  const updatedBaseTemplate =
    '# managed by skuba\nnode_modules\n.DS_Store\n# end managed by skuba\n';

  const cases = [
    ['empty provided', baseTemplate, ''],

    ['provided with no managed section', baseTemplate, '.DS_Store\n'],
    [
      'provided with outdated managed section',
      updatedBaseTemplate,
      baseTemplate,
    ],
    ['identical', baseTemplate, baseTemplate],
    [
      'provided with managed section and additional lines',
      baseTemplate,
      `.idea\n.vscode\n\n${baseTemplate}\n.DS_Store\nnode_modules\n`,
    ],
    [
      'provided with outdated managed section and additional lines',
      updatedBaseTemplate,
      `.idea\n.vscode\n\n${baseTemplate}\n.DS_Store\nnode_modules\n`,
    ],
  ] as const;

  test.each(cases)('%s', (_, base, provided) =>
    expect(mergeWithIgnoreFile(base)(provided)).toMatchSnapshot(),
  );

  it('produces stable output over multiple runs', () => {
    const merge = mergeWithIgnoreFile(baseTemplate);

    let input = baseTemplate;

    for (let i = 0; i < 5; i++) {
      input = merge(input);

      expect(input).toBe(baseTemplate);
    }
  });
});
