import { Runtype } from 'runtypes';
import { filter } from 'runtypes-filter';

export const validate = <T>(input: unknown, schema: Runtype<T>) => {
  const unfilteredValue = schema.check(input);

  return filter(schema, unfilteredValue);
};

export const validateJson = <T>(input: string, schema: Runtype<T>) =>
  validate(JSON.parse(input), schema);
