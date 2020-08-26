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
    process.exit(err.exitCode);
  }

  log.err(err);
  process.exit(1);
};

export const isErrorWithCode = <T>(
  err: unknown,
  code: T,
): err is Record<PropertyKey, unknown> & { code: T } =>
  hasProp(err, 'code') && err.code === code;
