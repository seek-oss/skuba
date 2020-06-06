import prettier from 'prettier';

import { isObject } from '../../../utils/validation';

export const formatObject = (data: Record<PropertyKey, unknown>) => {
  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([keyA], [keyB]) =>
      String(keyA).localeCompare(String(keyB)),
    ),
  );

  const output = JSON.stringify(sortedData, null, 2);

  return prettier.format(output, { parser: 'json' });
};

export const parseObject = (
  input: string | undefined,
): Record<PropertyKey, unknown> | undefined => {
  if (typeof input === 'undefined') {
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
