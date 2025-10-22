import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchJestSnapshots } from './patchJestSnapshots.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchJestSnapshots', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no test files found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchJestSnapshots({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no test files found',
    });
  });

  it('should skip if test files do not contain the old URL', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['test1.test.ts']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      'No snapshot URL here' as never,
    );
    await expect(
      tryPatchJestSnapshots({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no test files to patch',
    });
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['test1.test.ts']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      'Some content with https://goo.gl/fbAQLP' as never,
    );

    await expect(
      tryPatchJestSnapshots({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should patch test files', async () => {
    vi.mocked(fg).mockResolvedValueOnce([
      'test1.test.ts',
      'test2.test.ts',
      'test3.test.ts.snap',
    ]);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('Some content with https://goo.gl/fbAQLP' as never)
      .mockResolvedValueOnce('No snapshot URL here' as never)
      .mockResolvedValueOnce(
        'Some other content with https://goo.gl/fbAQLP' as never,
      );

    await expect(
      tryPatchJestSnapshots({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'test1.test.ts',
      'Some content with https://jestjs.io/docs/snapshot-testing',
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'test3.test.ts.snap',
      'Some other content with https://jestjs.io/docs/snapshot-testing',
      'utf8',
    );

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });
});
