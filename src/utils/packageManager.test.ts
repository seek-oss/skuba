const findUp = jest.fn();

jest.mock('find-up', () => findUp);

import * as exec from './exec.js';
import { detectPackageManager } from './packageManager.js';

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

const mockExec = jest.fn().mockResolvedValue({});

jest.spyOn(exec, 'createExec').mockReturnValue(mockExec);

const stdout = () => stdoutMock.mock.calls.flat(1).join('').trim();

afterEach(stdoutMock.mockReset);

describe('detectPackageManager', () => {
  it('detects pnpm', async () => {
    findUp.mockImplementation((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml' ? '/root/pnpm-lock.yaml' : undefined,
      ),
    );

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "pnpm",
        "print": {
          "exec": "pnpm exec",
          "runSilent": "pnpm --silent run",
          "update": "pnpm update",
        },
      }
    `);

    expect(stdout()).toBe('');
  });

  it('preferences yarn on confusing project setups with sibling lockfiles', async () => {
    findUp.mockImplementation((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml' ? '/root/pnpm-lock.yaml' : '/root/yarn.lock',
      ),
    );

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "yarn",
        "print": {
          "exec": "yarn",
          "runSilent": "yarn -s",
          "update": "yarn upgrade",
        },
      }
    `);

    expect(stdout()).toBe('');
  });

  it('preferences the closest lockfile if at different levels', async () => {
    findUp.mockImplementation((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml'
          ? '/root/a/b/c/pnpm-lock.yaml'
          : '/root/yarn.lock',
      ),
    );

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "pnpm",
        "print": {
          "exec": "pnpm exec",
          "runSilent": "pnpm --silent run",
          "update": "pnpm update",
        },
      }
    `);

    expect(stdout()).toBe('');
  });

  it('detects yarn', async () => {
    findUp.mockImplementation((file: string) =>
      Promise.resolve(file === 'yarn.lock' ? '/root/yarn.lock' : undefined),
    );

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "yarn",
        "print": {
          "exec": "yarn",
          "runSilent": "yarn -s",
          "update": "yarn upgrade",
        },
      }
    `);

    expect(stdout()).toBe('');
  });

  it('defaults on unrecognised package manager', async () => {
    findUp.mockResolvedValue(undefined);

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "pnpm",
        "print": {
          "exec": "pnpm exec",
          "runSilent": "pnpm --silent run",
          "update": "pnpm update",
        },
      }
    `);

    expect(stdout()).toBe(
      [
        'Failed to detect package manager; defaulting to pnpm.',
        'No package manager lockfile found.',
      ].join('\n'),
    );
  });

  it('defaults on detection failure', async () => {
    const message = 'Badness!';

    findUp.mockRejectedValue(new Error(message));

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "pnpm",
        "print": {
          "exec": "pnpm exec",
          "runSilent": "pnpm --silent run",
          "update": "pnpm update",
        },
      }
    `);

    expect(stdout()).toBe(
      ['Failed to detect package manager; defaulting to pnpm.', message].join(
        '\n',
      ),
    );
  });
});
