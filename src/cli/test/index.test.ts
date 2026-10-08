import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const exec = vi.hoisted(() => vi.fn());

vi.mock('../../utils/env.js', async () => ({
  ...(await vi.importActual('../../utils/env.js')),
  isCiEnv: vi.fn(),
}));

vi.mock('../../utils/exec.js', () => ({
  createExec: () => exec,
}));

vi.mock('../lint/index.js', () => ({
  lint: vi.fn(),
}));

vi.mock('../lint/internalLints/upgrade/index.js', () => ({
  upgradeSkuba: vi.fn(),
}));

vi.mock('./annotate.js', () => ({
  createAnnotations: vi.fn().mockResolvedValue(undefined),
}));

import { isCiEnv } from '../../utils/env.js';
import { lint } from '../lint/index.js';
import { upgradeSkuba } from '../lint/internalLints/upgrade/index.js';

import { test } from './index.js';

const originalArgv = process.argv;

beforeEach(() => {
  process.argv = originalArgv;
  process.exitCode = undefined;
  exec.mockResolvedValue({ exitCode: 0 });
  vi.mocked(isCiEnv).mockReturnValue(false);
  vi.mocked(lint).mockResolvedValue(undefined);
  vi.mocked(upgradeSkuba).mockResolvedValue({ ok: true, fixable: false });
});

afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = undefined;
  vi.clearAllMocks();
});

it('does not upgrade outside CI', async () => {
  await test();

  expect(upgradeSkuba).not.toHaveBeenCalled();
  expect(lint).not.toHaveBeenCalled();
  expect(exec.mock.calls[0]?.[0]).toBe('vitest');
});

it('does not lint when the upgrade has nothing to apply', async () => {
  vi.mocked(isCiEnv).mockReturnValue(true);

  await test();

  expect(upgradeSkuba).toHaveBeenCalledWith('format', expect.anything());
  expect(lint).not.toHaveBeenCalled();
  expect(exec.mock.calls[0]?.[0]).toBe('vitest');
});

it('lints with pending changes after an upgrade so a clean lint still pushes', async () => {
  vi.mocked(isCiEnv).mockReturnValue(true);
  vi.mocked(upgradeSkuba).mockResolvedValue({
    ok: true,
    fixable: false,
    upgraded: true,
  });
  process.argv = ['node', 'skuba', '--coverage', 'src/example.test.ts'];

  await test();

  expect(lint).toHaveBeenCalledWith([], undefined, true, {
    pendingChanges: true,
  });
  expect(exec.mock.calls[0]?.[0]).toBe('vitest');
});

it('forwards only --debug into the post-upgrade lint', async () => {
  vi.mocked(isCiEnv).mockReturnValue(true);
  vi.mocked(upgradeSkuba).mockResolvedValue({
    ok: true,
    fixable: false,
    upgraded: true,
  });
  process.argv = ['node', 'skuba', '--debug', '--coverage'];

  await test();

  expect(lint).toHaveBeenCalledWith(['--debug'], undefined, true, {
    pendingChanges: true,
  });
});

it('still runs tests when the upgrade fails', async () => {
  vi.mocked(isCiEnv).mockReturnValue(true);
  vi.mocked(upgradeSkuba).mockRejectedValue(new Error('no manifest'));

  await test();

  expect(lint).not.toHaveBeenCalled();
  expect(exec.mock.calls[0]?.[0]).toBe('vitest');
  expect(process.exitCode).toBeUndefined();
});
