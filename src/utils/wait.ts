import { setTimeout } from 'timers/promises';

import { createTerseError } from './error.js';
import { pluralise } from './logging.js';

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
  promise: T | PromiseLike<T>,
  { s }: { s: number },
): Promise<TimeoutResult<T>> =>
  Promise.race<TimeoutResult<T>>([
    Promise.resolve(promise).then((value) => ({ ok: true, value })),
    setTimeout(s * 1_000, { ok: false }, { ref: false }),
  ]);
