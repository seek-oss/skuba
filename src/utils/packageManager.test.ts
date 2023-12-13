const detect = jest.fn();

jest.mock('detect-package-manager', () => ({ detect }));

import { detectPackageManager } from './packageManager';

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

const stdout = () => {
  if (!stdoutMock.mock.calls.length) {
    return;
  }

  const result = stdoutMock.mock.calls.flat(1).join('');

  return `\n${result}`;
};

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

    expect(stdout()).toBeUndefined();
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

    expect(stdout()).toBeUndefined();
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

    expect(stdout()).toContain(
      'Failed to detect package manager; defaulting to yarn.',
    );
  });

  it('defaults on detection failure', async () => {
    detect.mockRejectedValue(new Error('Badness!'));

    await expect(detectPackageManager()).resolves.toMatchInlineSnapshot(`
      {
        "command": "yarn",
        "exec": "yarn",
        "install": "yarn install",
        "runSilent": "yarn -s",
        "update": "yarn upgrade",
      }
    `);

    expect(stdout()).toContain(
      'Failed to detect package manager; defaulting to yarn.',
    );
  });
});
