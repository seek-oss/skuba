import { afterEach, describe, expect, it, vi } from 'vitest';

import { exec } from '../../../../../../utils/exec.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migratePnpmV11 } from './migratePnpmV11.js';

vi.mock('../../../../../../utils/exec.js');

const execMock = vi.mocked(exec);

describe('migratePnpmV11', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should skip if not a pnpm project', async () => {
    await expect(
      migratePnpmV11({
        mode: 'format',
        packageManager: { command: 'yarn' },
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not a pnpm project',
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should return apply and not run codemod if mode is lint', async () => {
    await expect(
      migratePnpmV11({
        mode: 'lint',
        packageManager: { command: 'pnpm' },
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should run the codemod and return apply if mode is format', async () => {
    await expect(
      migratePnpmV11({
        mode: 'format',
        packageManager: { command: 'pnpm' },
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(execMock).toHaveBeenCalledWith(
      'pnpx',
      'codemod',
      'run',
      'pnpm-v10-to-v11',
      '--no-interactive',
    );
    expect(execMock).toHaveBeenCalledTimes(1);
  });
});
