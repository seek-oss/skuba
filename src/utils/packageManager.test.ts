const findUp = jest.fn();

jest.mock('find-up', () => findUp);

import { detectPackageManager } from './packageManager';

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

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
        "exec": "pnpm exec",
        "install": "pnpm install",
        "runSilent": "pnpm --silent run",
        "update": "pnpm update",
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
        "exec": "yarn",
        "install": "yarn install",
        "runSilent": "yarn -s",
        "update": "yarn upgrade",
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
        "exec": "pnpm exec",
        "install": "pnpm install",
        "runSilent": "pnpm --silent run",
        "update": "pnpm update",
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
        "exec": "yarn",
        "install": "yarn install",
        "runSilent": "yarn -s",
        "update": "yarn upgrade",
      }
    `);

    expect(stdout()).toBe('');
  });

  it('defaults on unrecognised package manager', async () => {
    findUp.mockResolvedValue(undefined);

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "yarn",
        "exec": "yarn",
        "install": "yarn install",
        "runSilent": "yarn -s",
        "update": "yarn upgrade",
      }
    `);

    expect(stdout()).toBe(
      [
        'Failed to detect package manager; defaulting to yarn.',
        'No package manager lockfile found.',
      ].join('\n'),
    );
  });

  it('defaults on detection failure', async () => {
    const message = 'Badness!';

    findUp.mockRejectedValue(new Error(message));

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "yarn",
        "exec": "yarn",
        "install": "yarn install",
        "runSilent": "yarn -s",
        "update": "yarn upgrade",
      }
    `);

    expect(stdout()).toBe(
      ['Failed to detect package manager; defaulting to yarn.', message].join(
        '\n',
      ),
    );
  });
});
