import findUp, { type Options } from 'find-up';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('find-up');

import * as exec from './exec.js';
import { detectPackageManager } from './packageManager.js';

type FindUpStringOverload = Extract<
  typeof findUp,
  (
    name: string | readonly string[],
    options?: Options,
  ) => Promise<string | undefined>
>;

const stdoutMock = vi.fn();

vi.spyOn(console, 'log').mockImplementation((...args) =>
  stdoutMock(`${args.join(' ')}\n`),
);

const mockExec = vi.fn().mockResolvedValue({});

vi.spyOn(exec, 'createExec').mockReturnValue(mockExec);

const stdout = () => stdoutMock.mock.calls.flat(1).join('').trim();

afterEach(stdoutMock.mockReset);

describe('detectPackageManager', () => {
  it('detects pnpm', async () => {
    vi.mocked(findUp).mockImplementation(((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml' ? '/root/pnpm-lock.yaml' : undefined,
      )) as FindUpStringOverload);

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
    vi.mocked(findUp).mockImplementation(((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml' ? '/root/pnpm-lock.yaml' : '/root/yarn.lock',
      )) as FindUpStringOverload);

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
    vi.mocked(findUp).mockImplementation(((file: string) =>
      Promise.resolve(
        file === 'pnpm-lock.yaml'
          ? '/root/a/b/c/pnpm-lock.yaml'
          : '/root/yarn.lock',
      )) as FindUpStringOverload);

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
    vi.mocked(findUp).mockImplementation(((file: string) =>
      Promise.resolve(
        file === 'yarn.lock' ? '/root/yarn.lock' : undefined,
      )) as FindUpStringOverload);

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
    vi.mocked(findUp).mockResolvedValue(undefined);

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

    vi.mocked(findUp).mockRejectedValue(new Error(message));

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
