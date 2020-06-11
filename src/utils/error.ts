import { ExecaError } from 'execa';

import { log } from './logging';
import { hasNumberProp, hasProp } from './validation';

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
