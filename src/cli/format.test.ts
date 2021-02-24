import execa from 'execa';

import { hasStringProp } from '../utils/validation';

import { format } from './format';

jest.mock('execa');

const execaCalls = () =>
  ((execa as unknown) as jest.Mock<typeof execa>).mock.calls
    .flat(2)
    .map((val) =>
      Array.isArray(val) || !hasStringProp(val, 'localDir')
        ? val
        : { ...val, localDir: 'REDACTED' },
    );

describe('format', () => {
  const consoleLog = jest.spyOn(global.console, 'log').mockReturnValue();

  const consoleLogCalls = () => consoleLog.mock.calls.flat(2);

  afterEach(jest.clearAllMocks);

  const oldProcessArgv = process.argv;
  afterAll(() => (process.argv = oldProcessArgv));

  it('handles no flags', async () => {
    process.argv = [];

    await expect(format()).resolves.toBeUndefined();

    expect(execaCalls()).toMatchInlineSnapshot(`
      Array [
        "eslint",
        "--ext=js,ts,tsx",
        "--fix",
        ".",
        Object {
          "localDir": "REDACTED",
          "preferLocal": true,
          "stdio": "inherit",
        },
        "prettier",
        "--write",
        ".",
        Object {
          "localDir": "REDACTED",
          "preferLocal": true,
          "stdio": "inherit",
        },
      ]
    `);

    expect(consoleLogCalls()).toMatchInlineSnapshot(`
      Array [
        "✔ ESLint",
        "✔ Prettier",
      ]
    `);
  });

  it('handles debug flag', async () => {
    process.argv = ['something', '--dEbUg', 'else'];

    await expect(format()).resolves.toBeUndefined();

    expect(execaCalls()).toMatchInlineSnapshot(`
      Array [
        "eslint",
        "--debug",
        "--ext=js,ts,tsx",
        "--fix",
        ".",
        Object {
          "localDir": "REDACTED",
          "preferLocal": true,
          "stdio": "inherit",
        },
        "prettier",
        "--loglevel",
        "debug",
        "--write",
        ".",
        Object {
          "localDir": "REDACTED",
          "preferLocal": true,
          "stdio": "inherit",
        },
      ]
    `);

    expect(consoleLogCalls()).toMatchInlineSnapshot(`
      Array [
        "✔ ESLint",
        "✔ Prettier",
      ]
    `);
  });
});
