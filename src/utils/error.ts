import { ExecaError } from 'execa';

import { hasNumberProp, hasProp } from './validation';

const isExecaError = (err: unknown): err is ExecaError =>
  hasNumberProp(err, 'exitCode');

export const handleCliError = (err: unknown) => {
  if (isExecaError(err)) {
    process.exit(err.exitCode);
  }

  console.error(err);
  process.exit(1);
};

export const isErrorWithCode = <T>(
  err: unknown,
  code: T,
): err is Record<PropertyKey, unknown> & { code: T } =>
  hasProp(err, 'code') && err.code === code;
