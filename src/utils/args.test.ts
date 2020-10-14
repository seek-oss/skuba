import { parseArgs, unsafeMapYargs } from './args';

describe('parseArgs', () => {
  it('parses a macOS command with args', () => {
    const argv = [
      '/usr/local/bin/node',
      '/Users/user/repo/node_modules/.bin/skuba',
      'start',
      '--xyz',
    ];

    expect(parseArgs(argv)).toStrictEqual({
      commandName: 'start',
      args: ['--xyz'],
    });
  });

  it('parses a macOS command without args', () => {
    const argv = [
      '/usr/local/bin/node',
      '/Users/user/repo/node_modules/.bin/skuba',
      'start',
    ];

    expect(parseArgs(argv)).toStrictEqual({
      commandName: 'start',
      args: [],
    });
  });

  it('parses a Windows command with args', () => {
    const argv = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Users\\user\\repo\\node_modules\\@seek\\skuba\\lib\\commonjs\\skuba.js',
      'start',
      '--xyz',
    ];

    expect(parseArgs(argv)).toStrictEqual({
      commandName: 'start',
      args: ['--xyz'],
    });
  });

  it('parses a Windows command without args', () => {
    const argv = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Users\\user\\repo\\node_modules\\@seek\\skuba\\lib\\commonjs\\skuba.js',
      'start',
    ];

    expect(parseArgs(argv)).toStrictEqual({
      commandName: 'start',
      args: [],
    });
  });
});

describe('unsafeMapYargs', () => {
  it('maps an assortment of yargs', () =>
    expect(
      unsafeMapYargs({
        a: 1,
        b: '2',
        c: true,
        d: [3, '4'],
        e: [],
        f: false,
        g: undefined,
        h: null,
      }),
    ).toEqual(['--a=1', '--b=2', '--c', '--d=3']));
});
