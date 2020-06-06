import { ExecaError } from 'execa';

import { isObjectWithProp } from './validation';

const isExecaError = (err: unknown): err is ExecaError =>
  isObjectWithProp(err, 'exitCode') && typeof err.exitCode === 'number';

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
): err is Record<PropertyKey, unknown> & { code: T } => {
  if (!isObjectWithProp(err, 'code')) {
    return false;
  }

  return err.code === code;
};
