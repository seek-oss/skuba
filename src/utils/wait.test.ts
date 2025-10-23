import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as wait from './wait.js';

const delayMicrotask = () =>
  Promise.resolve()
    .then(() => undefined)
    .then(() => undefined)
    .then(() => undefined);

const sleep = vi.spyOn(wait, 'sleep');

beforeEach(vi.clearAllMocks);

describe('throwOnTimeout', () => {
  it('propagates a fulfilled promise within the timeout', async () => {
    sleep.mockImplementation(delayMicrotask);

    const value = 123;
    const promise = vi.fn().mockResolvedValue(value);

    await expect(wait.throwOnTimeout(promise(), { s: 3 })).resolves.toBe(value);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 3_000);
  });

  it('propagates a rejected promise within the timeout', async () => {
    sleep.mockImplementation(delayMicrotask);

    const err = new Error('Badness!');

    const promise = vi.fn().mockRejectedValue(err);

    await expect(wait.throwOnTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
  });

  it('enforces the timeout', async () => {
    sleep.mockResolvedValue();

    const promise = vi.fn().mockImplementation(delayMicrotask);

    await expect(
      wait.throwOnTimeout(promise(), { s: 1 }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Timed out after 1 second"`);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });
});

describe('withTimeout', () => {
  it('propagates a static value for easier `jest.mock`ing', async () => {
    sleep.mockImplementation(delayMicrotask);

    const value = 123;

    await expect(wait.withTimeout(value, { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });

  it('propagates a fulfilled promise within the timeout', async () => {
    sleep.mockImplementation(delayMicrotask);

    const value = 123;
    const promise = vi.fn().mockResolvedValue(value);

    await expect(wait.withTimeout(promise(), { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });

  it('propagates a rejected promise within the timeout', async () => {
    sleep.mockImplementation(delayMicrotask);

    const err = new Error('Badness!');

    const promise = vi.fn().mockRejectedValue(err);

    await expect(wait.withTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
  });

  it('enforces the timeout', async () => {
    sleep.mockResolvedValue();

    const promise = vi.fn().mockImplementation(delayMicrotask);

    await expect(wait.withTimeout(promise(), { s: 3 })).resolves.toStrictEqual({
      ok: false,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 3_000);
  });
});
