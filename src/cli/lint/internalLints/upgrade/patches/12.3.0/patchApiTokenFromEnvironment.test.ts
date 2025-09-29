import fg from 'fast-glob';
import fs from 'fs-extra';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchApiTokenFromEnvironment } from './patchApiTokenFromEnvironment.js';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchApiTokenFromEnvironment', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if no scripts found', async () => {
    jest.mocked(fg).mockResolvedValueOnce([]);
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
    jest.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    jest.mocked(fs.readFile).mockResolvedValueOnce('No usage here' as never);
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
    jest.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
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
    jest.mocked(fg).mockResolvedValueOnce(['scripts/test.ts']);
    jest
      .mocked(fs.readFile)
      .mockResolvedValueOnce(
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
