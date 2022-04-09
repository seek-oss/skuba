import * as wait from './wait';

const sleep = jest.spyOn(wait, 'sleep');

beforeEach(jest.resetAllMocks);

describe('throwOnTimeout', () => {
  const withMicrotaskDelay = () =>
    Promise.resolve()
      .then(() => undefined)
      .then(() => undefined);

  it('propagates a fulfilled promise within the timeout', async () => {
    sleep.mockImplementation(withMicrotaskDelay);

    const value = 123;
    const promise = jest.fn().mockResolvedValue(value);

    await expect(wait.throwOnTimeout(promise(), { s: 3 })).resolves.toBe(value);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 3_000);
  });

  it('propagates a rejected promise within the timeout', async () => {
    sleep.mockImplementation(withMicrotaskDelay);

    const err = new Error('Badness!');

    const promise = jest.fn().mockRejectedValue(err);

    await expect(wait.throwOnTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
  });

  it('enforces the timeout', async () => {
    sleep.mockResolvedValue();

    const promise = jest.fn().mockImplementation(withMicrotaskDelay);

    await expect(
      wait.throwOnTimeout(promise(), { s: 1 }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Timed out after 1 second"`);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });
});

describe('withTimeout', () => {
  const withMicrotaskDelay = () =>
    Promise.resolve()
      .then(() => undefined)
      .then(() => undefined);

  it('propagates a static value for easier `jest.mock`ing', async () => {
    sleep.mockImplementation(withMicrotaskDelay);

    const value = 123;

    await expect(wait.withTimeout(value, { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });

  it('propagates a fulfilled promise within the timeout', async () => {
    sleep.mockImplementation(withMicrotaskDelay);

    const value = 123;
    const promise = jest.fn().mockResolvedValue(value);

    await expect(wait.withTimeout(promise(), { s: 1 })).resolves.toStrictEqual({
      ok: true,
      value,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
  });

  it('propagates a rejected promise within the timeout', async () => {
    sleep.mockImplementation(withMicrotaskDelay);

    const err = new Error('Badness!');

    const promise = jest.fn().mockRejectedValue(err);

    await expect(wait.withTimeout(promise(), { s: 2 })).rejects.toThrow(err);

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
  });

  it('enforces the timeout', async () => {
    sleep.mockResolvedValue();

    const promise = jest.fn().mockImplementation(withMicrotaskDelay);

    await expect(wait.withTimeout(promise(), { s: 3 })).resolves.toStrictEqual({
      ok: false,
    });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenNthCalledWith(1, 3_000);
  });
});
