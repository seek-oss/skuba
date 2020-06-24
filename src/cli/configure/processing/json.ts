import prettier from 'prettier';

import { isObject } from '../../../utils/validation';

export const formatObject = (
  data: Record<PropertyKey, unknown>,
  filepath?: string,
) => {
  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([keyA], [keyB]) =>
      String(keyA).localeCompare(String(keyB)),
    ),
  );

  const output = JSON.stringify(sortedData, null, 2);

  return prettier.format(
    output,
    typeof filepath === 'undefined' ? { parser: 'json' } : { filepath },
  );
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
