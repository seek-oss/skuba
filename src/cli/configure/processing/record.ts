import { mergeWith } from 'lodash';

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const getFirstDefined = <T>(
  record: Record<string, T | undefined>,
  keys: string[],
): T | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== 'undefined') {
      return value;
    }
  }

  return;
};

export const merge = <A, B>(obj: A, src: B) =>
  mergeWith(obj, src, (objValue: unknown, srcValue: unknown) => {
    if (isArray(objValue) && isArray(srcValue)) {
      return [...new Set(objValue.concat(srcValue))].sort();
    }

    return;
  });
