import { createEjsRenderer, createStringReplacer } from './copy';

describe('createEjsRenderer', () => {
  it('renders typical skuba placeholders', () => {
    const input = {
      name: '<%- packageName %>',
      repository: {
        url: 'git+ssh://git@github.com/<%- orgName %>/<%- repoName %>.git',
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
        url: 'git+ssh://git@github.com/seek-oss/koala.git',
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
