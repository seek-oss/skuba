import path from 'path';

import { parseTscArgs } from './args.js';

describe('parseTscArgs', () => {
  const cwd = process.cwd();

  const stripRelativePrefix = (str: string) =>
    str.startsWith(cwd) ? path.relative(cwd, str) || '.' : str;

  const act = (args: string[]) => {
    const tscArgs = parseTscArgs(args);

    return {
      ...tscArgs,
      dirname: stripRelativePrefix(tscArgs.dirname),
      pathname: stripRelativePrefix(tscArgs.pathname),
    };
  };

  it('handles no args', () =>
    expect(act([])).toStrictEqual({
      basename: 'tsconfig.build.json',
      build: false,
      dirname: '.',
      pathname: 'tsconfig.build.json',
      project: undefined,
    }));

  it('handles irrelevant args', () =>
    expect(act(['-xyz', '--what'])).toStrictEqual({
      basename: 'tsconfig.build.json',
      build: false,
      dirname: '.',
      pathname: 'tsconfig.build.json',
      project: undefined,
    }));

  describe.each(['-b', '--build'])('%s', (flag) => {
    it('handles build mode', () =>
      expect(act([flag])).toStrictEqual({
        basename: 'tsconfig.build.json',
        build: true,
        dirname: '.',
        pathname: 'tsconfig.build.json',
        project: undefined,
      }));
  });

  describe.each(['-p', '--project'])('%s', (flag) => {
    it('handles filename', () =>
      expect(act([flag, 'tsconfig.prod.json'])).toStrictEqual({
        basename: 'tsconfig.prod.json',
        build: false,
        dirname: '.',
        pathname: 'tsconfig.prod.json',
        project: 'tsconfig.prod.json',
      }));

    it('handles directory', () =>
      expect(act([flag, 'path/to'])).toStrictEqual({
        basename: 'tsconfig.json',
        build: false,
        dirname: 'path/to',
        pathname: 'path/to/tsconfig.json',
        project: 'path/to',
      }));

    it('handles path', () =>
      expect(act([flag, '/mnt/c/tsconfig.dev.json'])).toStrictEqual({
        basename: 'tsconfig.dev.json',
        build: false,
        dirname: '/mnt/c',
        pathname: '/mnt/c/tsconfig.dev.json',
        project: '/mnt/c/tsconfig.dev.json',
      }));
  });
});
