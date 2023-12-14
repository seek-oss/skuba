const detect = jest.fn();

jest.mock('detect-package-manager', () => ({ detect }));

import { detectPackageManager } from './packageManager';

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

const stdout = () => stdoutMock.mock.calls.flat(1).join('').trim();

afterEach(stdoutMock.mockReset);

describe('detectPackageManager', () => {
  it('detects pnpm', async () => {
    detect.mockResolvedValue('pnpm');
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
    detect.mockResolvedValue('yarn');

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
    detect.mockResolvedValue('npm');

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
        'Expected pnpm|yarn, received npm',
      ].join('\n'),
    );
  });

  it('defaults on detection failure', async () => {
    const message = 'Badness!';

    detect.mockRejectedValue(new Error(message));

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
