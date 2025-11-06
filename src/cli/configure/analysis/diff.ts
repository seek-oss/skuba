import { styleText } from 'node:util';

export const determineOperation = (
  oldData?: string,
  newData?: string,
): string => {
  if (oldData === undefined) {
    return styleText('green', 'A');
  }

  return newData === undefined ? styleText('red', 'D') : styleText('yellow', 'M');
};
