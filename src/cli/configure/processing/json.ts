import { isObject } from '../../../utils/validation.ts';

export const parseObject = (
  input: string | undefined,
): Record<Exclude<PropertyKey, symbol>, unknown> | undefined => {
  if (input === undefined) {
    return;
  }

  try {
    const data = JSON.parse(input) as unknown;

    if (isObject(data)) {
      return data;
    }
  } catch {}

  return;
};
