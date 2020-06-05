import prettier from 'prettier';

export const formatObject = (data: object) => {
  const sortedData = Object.fromEntries(
    Object.entries(data).sort(([keyA], [keyB]) =>
      String(keyA).localeCompare(String(keyB)),
    ),
  );

  const output = JSON.stringify(sortedData, null, 2);

  return prettier.format(output, { parser: 'json' });
};

export const parseObject = <T>(input: string | undefined): T | undefined => {
  if (typeof input === 'undefined') {
    return;
  }

  try {
    const data = JSON.parse(input);

    if (typeof data === 'object' && data !== null) {
      return data;
    }
  } catch {}

  return;
};
