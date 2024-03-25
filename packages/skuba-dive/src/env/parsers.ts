export const nonNegativeInteger = (input: string, name: string): number => {
  const int = parseInt(input, 10);

  if (int < 0 || !Number.isSafeInteger(int) || input !== String(int)) {
    throw Error(
      `process.env.${name} is not a non-negative integer: '${input}'`,
    );
  }

  return int;
};

export const noop = <T>(input: T, _name: string): T => input;

export const oneOf = <T>(choices: readonly T[]) => {
  const isChoice = (value: unknown): value is (typeof choices)[number] =>
    new Set<unknown>(choices).has(value);

  return (input: unknown, name: string): (typeof choices)[number] => {
    if (!isChoice(input)) {
      throw Error(
        `process.env.${name} is not a supported choice: '${String(
          input,
        )}'. Expected one of: [${choices
          .map((choice) => `'${String(choice)}'`)
          .join(', ')}]`,
      );
    }

    return input;
  };
};

const falseys = ['false', 'off', 'no', 'n', '0'];

export const boolean = (input: string): boolean =>
  falseys.includes(input.toLowerCase()) ? false : Boolean(input);
