import {
  generateIgnoreFileSimpleVariants,
  mergeWithConfigFile,
} from './configFile';

describe('generateIgnoreFileSimpleVariants', () => {
  it.each([
    ['variant path', ['/lib*/'], ['/lib*/', '/lib/', '/lib', 'lib/', 'lib']],
    ['non-variant path', ['lib'], ['/lib', '/lib/', 'lib', 'lib/']],
    ['duplicate patterns', ['lib', 'lib'], ['/lib', '/lib/', 'lib', 'lib/']],
    [
      'file extension',
      ['*.tgz'],
      ['*.tgz', '.tgz', '.tgz/', '/.tgz', '/.tgz/'],
    ],
    ['potential empty string', ['/'], ['/']],
    ['empty string', [''], []],
  ])('handles %s', (_, pattern, expected) =>
    expect(generateIgnoreFileSimpleVariants(pattern)).toEqual(
      new Set(expected),
    ),
  );
});

describe('mergeWithConfigFile for ignore files', () => {
  const baseTemplate =
    '# managed by skuba\nnode_modules*/\n# end managed by skuba\n';
  const updatedBaseTemplate =
    '# managed by skuba\nnode_modules*/\n.DS_Store\n# end managed by skuba\n';

  const cases = [
    ['empty provided', baseTemplate, ''],

    ['provided with no managed section', baseTemplate, '.DS_Store\n'],
    [
      'provided with managed section and partially superseded config',
      updatedBaseTemplate,
      'system32\n\n.DS_Store\nnode_modules/\n\n*.zip\n',
    ],
    [
      'provided with managed section and fully superseded config',
      updatedBaseTemplate,
      '\r\n\nnode_modules\r\nnode_modules_bak\n/node_modules',
    ],
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
    expect(mergeWithConfigFile(base)(provided)).toMatchSnapshot(),
  );

  test.each(cases)('%s', (_, base, provided) =>
    expect(mergeWithConfigFile(base)(provided)).toMatchSnapshot(),
  );

  it('produces stable output over multiple runs', () => {
    const merge = mergeWithConfigFile(baseTemplate);

    let input = baseTemplate;

    for (let i = 0; i < 5; i++) {
      input = merge(input);

      expect(input).toBe(baseTemplate);
    }
  });
});

describe('mergeWithConfigFile for workspace files', () => {
  const baseTemplate = `# managed by skuba
packageManagerStrictVersion: true
publicHoistPattern:
  - '@types*'
  # end managed by skuba
`;
  const updatedBaseTemplate = `# managed by skuba
packageManagerStrictVersion: true
publicHoistPattern:
  - '@types*'
  - '*eslint*'
  # end managed by skuba
`;

  const cases = [
    ['empty provided', baseTemplate, ''],

    ['provided with no managed section', baseTemplate, 'packages:\n  - a\n'],
    [
      'provided with outdated managed section',
      updatedBaseTemplate,
      baseTemplate,
    ],
    ['identical', baseTemplate, baseTemplate],
    [
      'provided with managed section and additional lines',
      baseTemplate,
      `anotherSetting:true\n${baseTemplate}  - x`,
    ],
    [
      'provided with outdated managed section and additional lines',
      updatedBaseTemplate,
      `anotherSetting:true\n${baseTemplate}  - x`,
    ],
  ] as const;

  test.each(cases)('%s', (_, base, provided) =>
    expect(
      mergeWithConfigFile(base, 'pnpm-workspace')(provided),
    ).toMatchSnapshot(),
  );

  it('produces stable output over multiple runs', () => {
    const merge = mergeWithConfigFile(baseTemplate, 'pnpm-workspace');

    let input = baseTemplate;

    for (let i = 0; i < 5; i++) {
      input = merge(input);

      expect(input).toBe(baseTemplate);
    }
  });
});
