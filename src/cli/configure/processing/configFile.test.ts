import {
  generateIgnoreFileSimpleVariants,
  mergeWithConfigFile,
} from './configFile.js';

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

describe('mergeWithConfigFile for workspace files with minimumReleaseAgeExcludeOverload', () => {
  const baseTemplate = `# managed by skuba
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - 'default-exclude'
packageManagerStrictVersion: true
  # end managed by skuba`;

  const validPackageJson = JSON.stringify({
    name: 'test-package',
    minimumReleaseAgeExcludeOverload: ['test-package', 'another-package/*'],
  });

  const packageJsonWithEmptyArray = JSON.stringify({
    name: 'test-package',
    minimumReleaseAgeExcludeOverload: [],
  });

  const packageJsonWithInvalidField = JSON.stringify({
    name: 'test-package',
    minimumReleaseAgeExcludeOverload: 'not-an-array',
  });

  const packageJsonWithMixedTypes = JSON.stringify({
    name: 'test-package',
    minimumReleaseAgeExcludeOverload: ['valid-string', 123, 'another-string'],
  });

  const packageJsonWithoutField = JSON.stringify({
    name: 'test-package',
  });

  it('adds minimumReleaseAgeExcludeOverload items to template', () => {
    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      validPackageJson,
    );
    const result = merge('');

    expect(result).toContain("  - 'test-package'");
    expect(result).toContain("  - 'another-package/*'");
    expect(result).toContain("  - 'default-exclude'");
  });

  it('handles empty minimumReleaseAgeExcludeOverload array', () => {
    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      packageJsonWithEmptyArray,
    );
    const result = merge('');

    expect(result).toContain("  - 'default-exclude'");
    expect(result).not.toContain("  - 'test-package'");
  });

  it('ignores invalid minimumReleaseAgeExcludeOverload field type', () => {
    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      packageJsonWithInvalidField,
    );
    const result = merge('');

    expect(result).toContain("  - 'default-exclude'");
    expect(result).not.toContain('not-an-array');
  });

  it('ignores array with mixed types in minimumReleaseAgeExcludeOverload', () => {
    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      packageJsonWithMixedTypes,
    );
    const result = merge('');

    expect(result).toContain("  - 'default-exclude'");
    expect(result).not.toContain("  - 'valid-string'");
    expect(result).not.toContain('123');
  });

  it('works when minimumReleaseAgeExcludeOverload field is missing', () => {
    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      packageJsonWithoutField,
    );
    const result = merge('');

    expect(result).toContain("  - 'default-exclude'");
  });

  it('handles invalid JSON in package.json', () => {
    const invalidJson = '{ "name": "test", invalid json }';

    expect(() => {
      mergeWithConfigFile(baseTemplate, 'pnpm-workspace', invalidJson);
    }).toThrow('package.json is not valid JSON');
  });

  it('works without package.json parameter', () => {
    const merge = mergeWithConfigFile(baseTemplate, 'pnpm-workspace');
    const result = merge('');

    expect(result).toContain("  - 'default-exclude'");
  });

  it('preserves existing file content when merging with overloads', () => {
    const existingFile = `custom-setting: true
anotherSetting: false

${baseTemplate}

packages:
  - custom-package`;

    const merge = mergeWithConfigFile(
      baseTemplate,
      'pnpm-workspace',
      validPackageJson,
    );
    const result = merge(existingFile);

    expect(result).toContain('custom-setting: true');
    expect(result).toContain('anotherSetting: false');
    expect(result).toContain('packages:');
    expect(result).toContain('  - custom-package');
    expect(result).toContain("  - 'test-package'");
    expect(result).toContain("  - 'another-package/*'");
  });

  it('handles multiple minimumReleaseAgeExclude sections correctly', () => {
    const templateWithMultipleSections = `# managed by skuba
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - 'first-exclude'
someOtherSetting: true
minimumReleaseAgeExclude:
  - 'should-not-modify'
  # end managed by skuba`;

    const merge = mergeWithConfigFile(
      templateWithMultipleSections,
      'pnpm-workspace',
      validPackageJson,
    );
    const result = merge('');

    // Should only modify the first occurrence within managed section
    expect(result).toContain("  - 'first-exclude'");
    expect(result).toContain("  - 'test-package'");
    expect(result).toContain("  - 'another-package/*'");
    expect(result).toContain("  - 'should-not-modify'");
  });
});
