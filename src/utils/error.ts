/* eslint-disable new-cap */

import { ExecaError } from 'execa';
import * as t from 'runtypes';

import { log } from './logging';
import { hasNumberProp, hasProp } from './validation';

export type ConcurrentlyErrors = t.Static<typeof ConcurrentlyErrors>;

export const ConcurrentlyErrors = t.Array(
  t.Record({
    command: t.Record({
      command: t.String,
      name: t.String,
    }),
    index: t.Number,
    exitCode: t.Number,
  }),
);

const isExecaError = (err: unknown): err is ExecaError =>
  hasNumberProp(err, 'exitCode');

export const handleCliError = (err: unknown) => {
  if (isExecaError(err)) {
    process.exitCode = err.exitCode;
    return;
  }

  log.err(err);
  process.exitCode = 1;
  return;
};

export const isErrorWithCode = <T>(
  err: unknown,
  code: T,
): err is Record<PropertyKey, unknown> & { code: T } =>
  hasProp(err, 'code') && err.code === code;
