import path from 'path';

import {
  buildPatternToFilepathMap,
  crawlDirectory,
  createInclusionFilter,
} from './dir';
import { BASE_TEMPLATE_DIR } from './template';

describe('buildPatternToFilepathMap', () => {
  it('deals with different levels of nesting', () =>
    expect(
      buildPatternToFilepathMap(
        ['file.txt', '*/file.txt', '**/file.txt'],
        ['file.txt', 'a/file.txt', 'a/b/file.txt', 'file.unrelated'],
      ),
    ).toMatchInlineSnapshot(`
      {
        "**/file.txt": [
          "file.txt",
          "a/file.txt",
          "a/b/file.txt",
        ],
        "*/file.txt": [
          "a/file.txt",
        ],
        "file.txt": [
          "file.txt",
        ],
      }
    `));

  it('deals with different filenames and extensions', () =>
    expect(
      buildPatternToFilepathMap(
        ['a.*', 'b*.md', '*.md', '*.txt'],
        ['a.md', 'a.ts', 'b.md', 'bs.md', 'b.s.md', 'b.ts', 'b.unrelated'],
      ),
    ).toMatchInlineSnapshot(`
      {
        "*.md": [
          "a.md",
          "b.md",
          "bs.md",
          "b.s.md",
        ],
        "*.txt": [],
        "a.*": [
          "a.md",
          "a.ts",
        ],
        "b*.md": [
          "b.md",
          "bs.md",
          "b.s.md",
        ],
      }
    `));

  it('deals with different filenames and extensions (with options)', () =>
    expect(
      buildPatternToFilepathMap(
        ['**/*.vocab/*trans.json'],
        [
          'src/app.ts',
          'src/.vocab/index.ts',
          'src/.vocab/trans.json',
          'src/.vocab/id.trans.json',
          'src/.vocab/th.trans.json',
          'src/other.vocab/index.ts',
          'src/other.vocab/trans.json',
          'src/other.vocab/id.trans.json',
          'src/other.vocab/th.trans.json',
        ],
        { dot: true, ignore: '**/id.trans.json' },
      ),
    ).toMatchInlineSnapshot(`
      {
        "**/*.vocab/*trans.json": [
          "src/.vocab/trans.json",
          "src/.vocab/th.trans.json",
          "src/other.vocab/trans.json",
          "src/other.vocab/th.trans.json",
        ],
      }
    `));
});

describe('crawlDirectory', () => {
  it('works on skuba itself', async () => {
    const filepaths = await crawlDirectory(path.join(__dirname, '..', '..'));

    expect(filepaths).toContain('.github/CODEOWNERS');
    expect(filepaths).toContain('src/index.ts');
    expect(filepaths).toContain('LICENSE');
    expect(filepaths).not.toContain('.git/HEAD');
    expect(filepaths).not.toContain('lib/index.js');
    expect(filepaths).not.toContain('node_modules/.bin/tsc');
  });
});

describe('createInclusionFilter', () => {
  it('gracefully handles non-existent .gitignore', () => {
    const promise = createInclusionFilter([
      'wjifojwf9032jf930jf902jf902jf90j09',
    ]);

    return expect(promise).resolves.toBeDefined();
  });

  describe('with sensible template defaults and explicit inclusions', () => {
    let include: (pathname: string) => boolean;

    beforeAll(async () => {
      include = await createInclusionFilter(
        [path.join(BASE_TEMPLATE_DIR, '_.gitignore')],
        ['.vscode/extensions.json'],
      );
    });

    it.each([
      '.git/hooks',
      // TODO: ensure that `.npmrc` is not wrongly included in a code path that
      // could lead to accidental exposure.
      // '.npmrc',
      'lib/index.js',
      'lib/tsconfig.tsbuildinfo',
      'node_modules_bak/abc',
      'node_modules/abc',
      'packages/blah/node_modules/abc',
      'tmp/file',
    ])('excludes %s', (filename) => expect(include(filename)).toBe(false));

    it.each([
      '.buildkite/pipeline.yml',
      '.eslintignore',
      '.prettierrc.js',
      'Dockerfile',
      'jest.config.ts',
      '.vscode/extensions.json',
      'README.md',
      'src/app.ts',
    ])('includes %s', (filename) => expect(include(filename)).toBe(true));
  });
});
