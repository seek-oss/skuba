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

  describe('with sensible template defaults', () => {
    let include: (pathname: string) => boolean;

    beforeAll(async () => {
      include = await createInclusionFilter([
        path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
      ]);
    });

    it.each([
      '.git/hooks',
      '.npmrc',
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
      'README.md',
      'src/app.ts',
    ])('includes %s', (filename) => expect(include(filename)).toBe(true));
  });
});
