import { prependImport, stripImports } from './javascript.js';

describe('prependImport', () => {
  it('handles an empty file', () =>
    expect(prependImport('skuba')).toBe("import 'skuba';\n"));

  it('handles a non-empty file', () =>
    expect(prependImport('skuba', "console.log('hello world');\n")).toBe(
      "import 'skuba';\n\nconsole.log('hello world');\n",
    ));
});

describe('stripImports', () => {
  it('handles hits', () =>
    expect(
      stripImports(
        ['a', 'b', 'c'],
        `import 'a';\nimport * as b from "b";\n\n1\n\n2;\n\n3;\n`,
      ),
    ).toBe('1\n\n2;\n\n3;\n'));

  it('handles no hits', () =>
    expect(stripImports(['a', 'b', 'c'], '1\n\n2;\n\n3;\n')).toBe(
      '1\n\n2;\n\n3;\n',
    ));
});
