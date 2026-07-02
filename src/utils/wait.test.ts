import { setTimeout as sleep } from 'timers/promises';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as wait from './wait.js';

vi.mock('timers/promises');

const delayMicrotask = () =>
  Promise.resolve()
    .then(() => undefined)
    .then(() => undefined)
    .then(() => undefined);

const mockedSleep = vi.mocked(sleep);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('throwOnTimeout', () => {
  it('propagates a fulfilled promise within the timeout', async () => {
    mockedSleep.mockImplementation(delayMicrotask);

    const value = 123;
    const promise = vi.fn().mockResolvedValue(value);

    await expect(wait.throwOnTimeout(promise(), { s: 3 })).resolves.toBe(value);

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      3_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });

  it('propagates a rejected promise within the timeout', async () => {
    mockedSleep.mockImplementation(delayMicrotask);

    const err = new Error('Badness!');

    const promise = vi.fn().mockRejectedValue(err);

    await expect(wait.throwOnTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      2_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });

  it('enforces the timeout', async () => {
    mockedSleep.mockImplementation((_ms, value) => Promise.resolve(value));

    const promise = vi.fn().mockImplementation(delayMicrotask);

    await expect(
      wait.throwOnTimeout(promise(), { s: 1 }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Timed out after 1 second]`,
    );

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      1_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });
});

describe('withTimeout', () => {
  it('propagates a static value for easier `jest.mock`ing', async () => {
    mockedSleep.mockImplementation(delayMicrotask);

    const value = 123;

    await expect(wait.withTimeout(value, { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      1_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });

  it('propagates a fulfilled promise within the timeout', async () => {
    mockedSleep.mockImplementation(delayMicrotask);

    const value = 123;
    const promise = vi.fn().mockResolvedValue(value);

    await expect(wait.withTimeout(promise(), { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      1_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });

  it('propagates a rejected promise within the timeout', async () => {
    mockedSleep.mockImplementation(delayMicrotask);

    const err = new Error('Badness!');

    const promise = vi.fn().mockRejectedValue(err);

    await expect(wait.withTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      2_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });

  it('enforces the timeout', async () => {
    mockedSleep.mockImplementation((_ms, value) => Promise.resolve(value));

    const promise = vi.fn().mockImplementation(delayMicrotask);

    await expect(wait.withTimeout(promise(), { s: 3 })).resolves.toStrictEqual({
      ok: false,
    });

    expect(mockedSleep).toHaveBeenCalledTimes(1);
    expect(mockedSleep).toHaveBeenNthCalledWith(
      1,
      3_000,
      { ok: false },
      {
        ref: false,
      },
    );
  });
});
