import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchApiTokenFromEnvironment } from './patchApiTokenFromEnvironment.js';

vi.mock('fast-glob');
vi.mock('fs-extra');

describe('patchApiTokenFromEnvironment', () => {
  afterEach(() => vi.resetAllMocks());

  it('should skip if no scripts found', async () => {
    vi.mocked(fg).mockResolvedValueOnce([]);
    await expect(
      tryPatchApiTokenFromEnvironment({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no scripts found',
    });
  });

  it('should skip if scripts do not contain the apiTokenFromEnvironment usage', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    vi.mocked(fs.readFile).mockResolvedValueOnce('No usage here' as never);
    await expect(
      tryPatchApiTokenFromEnvironment({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no scripts to patch',
    });
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      "import { apiTokenFromEnvironment } from 'skuba/lib/api/github/environment';\n" as never,
    );

    await expect(
      tryPatchApiTokenFromEnvironment({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should patch scripts if mode is format', async () => {
    vi.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      ("import { apiTokenFromEnvironment } from 'skuba/lib/api/github/environment';\n\n" +
        'const client = new Octokit({ auth: apiTokenFromEnvironment() });') as never,
    );

    await expect(
      tryPatchApiTokenFromEnvironment({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      'scripts/test.ts',
      "import { GitHub } from 'skuba';\n\nconst client = new Octokit({ auth: GitHub.apiTokenFromEnvironment() });",
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });
});
