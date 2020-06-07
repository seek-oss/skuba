import path from 'path';

import { createInclusionFilter } from './copy';
import { BASE_TEMPLATE_DIR } from './template';

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
      'jest.config.js',
      'README.md',
      'src/app.ts',
    ])('includes %s', (filename) => expect(include(filename)).toBe(true));
  });
});
