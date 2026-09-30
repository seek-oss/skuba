import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReadResult } from '../cli/configure/types.js';

import { getConsumerManifest } from './manifest.js';
import { detectPnpmMajorVersion } from './pnpmVersion.js';

vi.mock('./manifest.js');

const getConsumerManifestMock = vi.mocked(getConsumerManifest);

const mockManifest = (packageJson: Record<string, unknown>) =>
  getConsumerManifestMock.mockResolvedValue({
    path: 'package.json',
    packageJson,
  } as ReadResult);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('detectPnpmMajorVersion', () => {
  it('reads the packageManager field', async () => {
    mockManifest({ packageManager: 'pnpm@11.8.0' });

    await expect(detectPnpmMajorVersion()).resolves.toBe(11);
  });

  it('ignores the integrity hash on the packageManager field', async () => {
    mockManifest({ packageManager: 'pnpm@10.34.5+sha512-abc123' });

    await expect(detectPnpmMajorVersion()).resolves.toBe(10);
  });

  it('ignores a packageManager field for another package manager', async () => {
    mockManifest({ packageManager: 'yarn@1.22.22' });

    await expect(detectPnpmMajorVersion()).resolves.toBeUndefined();
  });

  it('falls back to devEngines.packageManager', async () => {
    mockManifest({
      devEngines: { packageManager: { name: 'pnpm', version: '11.8.0' } },
    });

    await expect(detectPnpmMajorVersion()).resolves.toBe(11);
  });

  it('finds pnpm in a devEngines.packageManager array', async () => {
    mockManifest({
      devEngines: {
        packageManager: [
          { name: 'yarn', version: '1.22.22' },
          { name: 'pnpm', version: '^10.34.5' },
        ],
      },
    });

    await expect(detectPnpmMajorVersion()).resolves.toBe(10);
  });

  it('returns undefined when the project does not pin pnpm', async () => {
    mockManifest({ name: 'my-app' });

    await expect(detectPnpmMajorVersion()).resolves.toBeUndefined();
  });

  it('returns undefined when there is no manifest', async () => {
    getConsumerManifestMock.mockResolvedValue(undefined);

    await expect(detectPnpmMajorVersion()).resolves.toBeUndefined();
  });
});
