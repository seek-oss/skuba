import { execa } from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findAllowedLatestVersion } from './findLatestAllowedVersion.js';

vi.mock('execa');

const execaMock = vi.mocked(execa);

const NOW = new Date('2026-07-11T00:00:00.000Z');

const TIME_OUTPUT = {
  created: '2024-01-01T00:00:00.000Z',
  modified: '2026-06-22T21:34:08.132Z',
  '9.119.0': '2025-02-04T20:27:15.543Z',
  '9.120.0': '2025-02-05T20:13:34.491Z',
  '12.139.0': '2026-06-05T14:31:33.208Z', // ~36 days old
  '12.140.0': '2026-06-22T21:34:08.132Z', // ~19 days old
};

const mockExeca = ({
  time = TIME_OUTPUT,
  age,
}: {
  time?: unknown;
  age: string;
}) => {
  execaMock.mockImplementation(((_file: string, args: string[]) => {
    if (args.includes('view')) {
      return Promise.resolve({ stdout: JSON.stringify(time) });
    }
    if (args.includes('config')) {
      return Promise.resolve({ stdout: age });
    }
    throw new Error(`Unexpected execa call: ${args.join(' ')}`);
  }) as never);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('findAllowedLatestVersion', () => {
  it('returns the latest version satisfying the range', async () => {
    mockExeca({ age: '0' });

    await expect(
      findAllowedLatestVersion('datadog-lambda-js', '^12.0.0'),
    ).resolves.toBe('12.140.0');
  });

  it('ignores non-version keys like created/modified', async () => {
    mockExeca({ age: '0' });

    // `modified` shares 12.140.0's date; a leaked key would break this.
    await expect(
      findAllowedLatestVersion('datadog-lambda-js', '*'),
    ).resolves.toBe('12.140.0');
  });

  it('excludes versions newer than minimumReleaseAge', async () => {
    // 30 days in minutes: excludes 12.140.0 (~19d), keeps 12.139.0 (~36d).
    mockExeca({ age: String(30 * 24 * 60) });

    await expect(
      findAllowedLatestVersion('datadog-lambda-js', '^12.0.0'),
    ).resolves.toBe('12.139.0');
  });

  it('returns null when no version satisfies the range', async () => {
    mockExeca({ age: '0' });

    await expect(
      findAllowedLatestVersion('datadog-lambda-js', '^99.0.0'),
    ).resolves.toBeNull();
  });

  it('returns null when every match is too new', async () => {
    // 100 years in minutes: nothing is old enough.
    mockExeca({ age: String(100 * 365 * 24 * 60) });

    await expect(
      findAllowedLatestVersion('datadog-lambda-js', '^12.0.0'),
    ).resolves.toBeNull();
  });

  it.each(['', 'undefined'])(
    'treats %o config output as no age restriction',
    async (age) => {
      mockExeca({ age: `${age}\n` }); // trailing newline is trimmed

      await expect(
        findAllowedLatestVersion('datadog-lambda-js', '^12.0.0'),
      ).resolves.toBe('12.140.0');
    },
  );
});
