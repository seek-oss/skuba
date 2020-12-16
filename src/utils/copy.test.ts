import path from 'path';

import {
  createEjsRenderer,
  createInclusionFilter,
  createStringReplacer,
} from './copy';
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
      'jest.config.ts',
      'README.md',
      'src/app.ts',
    ])('includes %s', (filename) => expect(include(filename)).toBe(true));
  });
});

describe('createEjsRenderer', () => {
  it('renders typical skuba placeholders', () => {
    const input = {
      name: '<%- packageName %>',
      repository: {
        url: 'git+https://github.com/<%- orgName %>/<%- repoName %>.git',
      },
    };

    const templateData = {
      orgName: 'seek-oss',
      packageName: 'seek-koala',
      repoName: 'koala',
    };

    const render = createEjsRenderer(templateData);

    const output = render(JSON.stringify(input));

    expect(JSON.parse(output)).toEqual({
      name: 'seek-koala',
      repository: {
        url: 'git+https://github.com/seek-oss/koala.git',
      },
    });
  });
});

describe('createStringReplacer', () => {
  it('replaces multiple instances of a global pattern', () => {
    const input = 'red green blue red green blue red green';

    const replace = createStringReplacer([
      {
        input: new RegExp('green', 'g'),
        output: 'yellow',
      },
    ]);

    const output = replace(input);

    expect(output).toBe('red yellow blue red yellow blue red yellow');
  });

  it('runs through multiple patterns', () => {
    const input = 'red green blue';

    const replace = createStringReplacer([
      {
        input: new RegExp('red', 'g'),
        output: 'cyan',
      },
      {
        input: new RegExp('green', 'g'),
        output: 'magenta',
      },
      {
        input: new RegExp('blue', 'g'),
        output: 'yellow',
      },
    ]);

    const output = replace(input);

    expect(output).toBe('cyan magenta yellow');
  });
});
