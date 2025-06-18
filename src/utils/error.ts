import { inspect } from 'util';

import type { ExecaError } from 'execa';
import { z } from 'zod';

import { log } from './logging.js';
import { hasNumberProp, hasProp } from './validation.js';

export type ConcurrentlyErrors = z.infer<typeof concurrentlyErrorsSchema>;

export const concurrentlyErrorsSchema = z.array(
  z.object({
    command: z.object({
      command: z.string(),
      name: z.string(),
    }),
    index: z.number(),
    exitCode: z.number(),
  }),
);

/**
 * Creates an error that returns its plain `message` rather than a full stack
 * trace when `util.inspect`ed.
 *
 * This can be useful for terser handling and logging of known error scenarios
 * that have descriptive messages.
 *
 * https://nodejs.org/api/util.html#custom-inspection-functions-on-objects
 */
export const createTerseError = (message?: string) =>
  Object.assign(new Error(message), {
    [inspect.custom]: () => message,
  });

const isExecaError = (err: unknown): err is ExecaError =>
  hasNumberProp(err, 'exitCode');

export const handleCliError = (err: unknown) => {
  if (isExecaError(err)) {
    process.exitCode = err.exitCode;
    return;
  }

  log.err(inspect(err));
  process.exitCode = 1;
  return;
};

export const isErrorWithCode = <T>(
  err: unknown,
  code: T,
): err is Record<PropertyKey, unknown> & { code: T } =>
  hasProp(err, 'code') && err.code === code;
