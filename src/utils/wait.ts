import { createTerseError } from './error';
import { pluralise } from './logging';

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const throwOnTimeout = async <T>(
  promise: PromiseLike<T>,
  { s }: { s: number },
): Promise<T> => {
  const result = await withTimeout(promise, { s });

  if (!result.ok) {
    throw createTerseError(`Timed out after ${pluralise(s, 'second')}`);
  }

  return result.value;
};

type TimeoutResult<T> = { ok: true; value: T } | { ok: false };

export const withTimeout = <T>(
  promise: PromiseLike<T>,
  { s }: { s: number },
): Promise<TimeoutResult<T>> =>
  Promise.race<TimeoutResult<T>>([
    promise.then((value) => ({ ok: true, value })),
    sleep(s * 1_000).then(() => ({ ok: false })),
  ]);
