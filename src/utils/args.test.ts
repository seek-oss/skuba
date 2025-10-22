import { describe, expect, it, test } from 'vitest';
import {
  hasDebugFlag,
  hasSerialFlag,
  parseProcessArgs,
  parseRunArgs,
} from './args.js';

describe('hasDebugFlag', () => {
  test.each`
    description                    | args                                | expected
    ${'no args'}                   | ${[]}                               | ${false}
    ${'unrelated args'}            | ${['something', 'else']}            | ${false}
    ${'single dash'}               | ${['-debug']}                       | ${false}
    ${'matching lowercase arg'}    | ${['--debug']}                      | ${true}
    ${'matching uppercase arg'}    | ${['--DEBUG']}                      | ${true}
    ${'matching spongebob arg'}    | ${['--dEBuG']}                      | ${true}
    ${'matching arg among others'} | ${['something', '--debug', 'else']} | ${true}
  `('$description => $expected', ({ args, expected }) =>
    expect(hasDebugFlag(args)).toBe(expected),
  );
});

describe('hasSerialFlag', () => {
  test.each`
    description                    | args                                 | env                                                                        | expected
    ${'no args'}                   | ${[]}                                | ${{}}                                                                      | ${false}
    ${'unrelated args'}            | ${['something', 'else']}             | ${{}}                                                                      | ${false}
    ${'single dash'}               | ${['-serial']}                       | ${{}}                                                                      | ${false}
    ${'matching lowercase arg'}    | ${['--serial']}                      | ${{}}                                                                      | ${true}
    ${'matching uppercase arg'}    | ${['--SERIAL']}                      | ${{}}                                                                      | ${true}
    ${'matching spongebob arg'}    | ${['--sERiaL']}                      | ${{}}                                                                      | ${true}
    ${'matching arg among others'} | ${['something', '--serial', 'else']} | ${{}}                                                                      | ${true}
    ${'unrelated env'}             | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: '123456789012:cicd' }}                | ${false}
    ${'matching env'}              | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: 'artefacts:npm' }}                    | ${true}
    ${'matching env at start'}     | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: 'artefacts:npm,123456789012:cicd' }}  | ${true}
    ${'matching env at end'}       | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: '123456789012:cicd,artefacts:npm' }}  | ${true}
    ${'matching env2 at start'}    | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: 'artefacts:npm2,123456789012:cicd' }} | ${true}
    ${'matching env2 at end'}      | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: '123456789012:cicd,artefacts:npm2' }} | ${true}
    ${'unrelated env2'}            | ${[]}                                | ${{ BUILDKITE_AGENT_META_DATA_QUEUE: '123456789012:cicd,artefacts:2npm' }} | ${false}
  `('$description => $expected', ({ args, env, expected }) =>
    expect(hasSerialFlag(args, env)).toBe(expected),
  );
});

describe('parseProcessArgs', () => {
  it('parses a macOS command with args', () => {
    const argv = [
      '/usr/local/bin/node',
      '/Users/user/repo/node_modules/.bin/skuba',
      'start',
      '--xyz',
    ];

    expect(parseProcessArgs(argv)).toStrictEqual({
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

    expect(parseProcessArgs(argv)).toStrictEqual({
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

    expect(parseProcessArgs(argv)).toStrictEqual({
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

    expect(parseProcessArgs(argv)).toStrictEqual({
      commandName: 'start',
      args: [],
    });
  });
});

describe('parseRunArgs', () => {
  interface TestCase {
    input: string;

    entryPoint: string | undefined;
    port: number | undefined;
    node: string[];
    script: string[];
  }

  test.each`
    input                                                | entryPoint     | port         | node                      | script                       | conditions
    ${''}                                                | ${undefined}   | ${undefined} | ${[]}                     | ${[]}                        | ${undefined}
    ${'--inspect'}                                       | ${undefined}   | ${undefined} | ${['--inspect']}          | ${[]}                        | ${undefined}
    ${'--inspect=1234'}                                  | ${undefined}   | ${undefined} | ${['--inspect=1234']}     | ${[]}                        | ${undefined}
    ${'--inspect 1234'}                                  | ${undefined}   | ${undefined} | ${['--inspect=1234']}     | ${[]}                        | ${undefined}
    ${'--inspect 1234 listen.ts'}                        | ${'listen.ts'} | ${undefined} | ${['--inspect=1234']}     | ${[]}                        | ${undefined}
    ${'--inspect 1234 listen.ts --inspect 1234'}         | ${'listen.ts'} | ${undefined} | ${['--inspect=1234']}     | ${['--inspect', '1234']}     | ${undefined}
    ${'--inspect listen.ts'}                             | ${'listen.ts'} | ${undefined} | ${['--inspect']}          | ${[]}                        | ${undefined}
    ${'--inspect-brk'}                                   | ${undefined}   | ${undefined} | ${['--inspect-brk']}      | ${[]}                        | ${undefined}
    ${'--inspect-brk=1234'}                              | ${undefined}   | ${undefined} | ${['--inspect-brk=1234']} | ${[]}                        | ${undefined}
    ${'--inspect-brk 1234'}                              | ${undefined}   | ${undefined} | ${['--inspect-brk=1234']} | ${[]}                        | ${undefined}
    ${'--inspect-brk 1234 listen.ts'}                    | ${'listen.ts'} | ${undefined} | ${['--inspect-brk=1234']} | ${[]}                        | ${undefined}
    ${'--inspect-brk 1234 listen.ts --inspect-brk 1234'} | ${'listen.ts'} | ${undefined} | ${['--inspect-brk=1234']} | ${['--inspect-brk', '1234']} | ${undefined}
    ${'--inspect-brk listen.ts'}                         | ${'listen.ts'} | ${undefined} | ${['--inspect-brk']}      | ${[]}                        | ${undefined}
    ${'--port'}                                          | ${undefined}   | ${undefined} | ${[]}                     | ${[]}                        | ${undefined}
    ${'--port=1234'}                                     | ${undefined}   | ${1234}      | ${[]}                     | ${[]}                        | ${undefined}
    ${'--port 1234'}                                     | ${undefined}   | ${1234}      | ${[]}                     | ${[]}                        | ${undefined}
    ${'--port 1234 listen.ts'}                           | ${'listen.ts'} | ${1234}      | ${[]}                     | ${[]}                        | ${undefined}
    ${'--port 1234 listen.ts --port 5678'}               | ${'listen.ts'} | ${1234}      | ${[]}                     | ${['--port', '5678']}        | ${undefined}
    ${'--port listen.ts'}                                | ${'listen.ts'} | ${undefined} | ${[]}                     | ${[]}                        | ${undefined}
    ${'listen.ts'}                                       | ${'listen.ts'} | ${undefined} | ${[]}                     | ${[]}                        | ${undefined}
    ${'listen.ts --inspect'}                             | ${'listen.ts'} | ${undefined} | ${[]}                     | ${['--inspect']}             | ${undefined}
    ${'listen.ts --inspect-brk'}                         | ${'listen.ts'} | ${undefined} | ${[]}                     | ${['--inspect-brk']}         | ${undefined}
    ${'listen.ts --port 1234'}                           | ${'listen.ts'} | ${undefined} | ${[]}                     | ${['--port', '1234']}        | ${undefined}
    ${'--conditions=test'}                               | ${undefined}   | ${undefined} | ${[]}                     | ${[]}                        | ${['test']}
    ${'--conditions=test --conditions=test2'}            | ${undefined}   | ${undefined} | ${[]}                     | ${[]}                        | ${['test', 'test2']}
  `('$input', ({ input, ...expected }: TestCase) =>
    expect(parseRunArgs(input.split(' '))).toEqual(expected),
  );
});
