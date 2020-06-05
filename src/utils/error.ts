import { ExecaError } from 'execa';

const hasOwnProperty = <O extends {}, P extends PropertyKey>(
  obj: O,
  prop: P,
): obj is O & Record<P, unknown> => obj.hasOwnProperty(prop);

const isObjectWithProperty = <P extends PropertyKey>(
  value: unknown,
  prop: P,
): value is Record<P, unknown> =>
  typeof value === 'object' && value !== null && hasOwnProperty(value, prop);

const isExecaError = (err: unknown): err is ExecaError =>
  isObjectWithProperty(err, 'exitCode') && typeof err.exitCode === 'number';

export const handleCliError = (err: unknown) => {
  if (isExecaError(err)) {
    process.exit(err.exitCode);
  }

  console.error(err);
  process.exit(1);
};
