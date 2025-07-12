import { createEjsRenderer, createStringReplacer } from './copy.js';
import { log } from './logging.js';

jest.mock('./logging', () => ({
  log: {
    err: jest.fn(),
    subtle: jest.fn(),
    bold: (text: string) => text,
  },
}));

afterEach(() => jest.clearAllMocks());

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

    const output = render('filename.txt', JSON.stringify(input));

    expect(JSON.parse(output)).toEqual({
      name: 'seek-koala',
      repository: {
        url: 'git+ssh://git@github.com/seek-oss/koala.git',
      },
    });
    expect(log.err).not.toHaveBeenCalled();
  });

  it('does not crash on malformed files', () => {
    const input = `<% really we should detect if something is textual or binary and skip if binary, but here we are`;
    const render = createEjsRenderer({});

    const output = render('filename.txt', input);

    expect(output).toEqual(input);
    expect(log.err).toHaveBeenCalledWith('Failed to render', 'filename.txt');
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

    const output = replace('filename.txt', input);

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

    const output = replace('filename.txt', input);

    expect(output).toBe('cyan magenta yellow');
  });
});
