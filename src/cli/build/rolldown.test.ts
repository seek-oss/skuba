import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exec } from '../../utils/exec.js';

import { rolldown } from './rolldown.js';

vi.mock('../../utils/exec.js', () => ({
  exec: vi.fn(),
}));

const execMock = vi.mocked(exec);

describe('rolldown', () => {
  beforeEach(() => {
    execMock.mockClear();
  });

  it('enforces a config file when no config is supplied', async () => {
    await rolldown([]);

    expect(execMock).toHaveBeenCalledWith('rolldown', '--config');
  });

  it('forwards additional arguments after the injected config flag', async () => {
    await rolldown(['--minify']);

    expect(execMock).toHaveBeenCalledWith('rolldown', '--config', '--minify');
  });

  it.each([
    ['--config', 'rolldown.worker1.config.ts'],
    ['-c', 'rolldown.worker1.config.ts'],
  ])(
    'passes through a user-supplied `%s %s` without duplicating the flag',
    async (flag, value) => {
      await rolldown([flag, value]);

      expect(execMock).toHaveBeenCalledWith('rolldown', flag, value);
    },
  );

  it.each([
    '--config=rolldown.worker1.config.ts',
    '-c=rolldown.worker1.config.ts',
  ])(
    'passes through a user-supplied `%s` without duplicating the flag',
    async (arg) => {
      await rolldown([arg]);

      expect(execMock).toHaveBeenCalledWith('rolldown', arg);
    },
  );
});
