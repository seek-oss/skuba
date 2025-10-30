import { createTerseError } from './error.js';
import { pluralise } from './logging.js';
import { sleep } from './sleep.js';

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

export const withTimeout = async <T>(
  promise: T | PromiseLike<T>,
  { s }: { s: number },
): Promise<TimeoutResult<T>> => {
  const timeout = sleep(s * 1_000);

  try {
    return await Promise.race<TimeoutResult<T>>([
      Promise.resolve(promise).then((value) => ({ ok: true, value })),
      timeout.then(() => ({ ok: false })),
    ]);
  } finally {
    timeout.clear?.();
  }
};
