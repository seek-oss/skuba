import { mergeWith } from 'lodash';

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
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return [...new Set(objValue.concat(srcValue))].sort();
    }

    return;
  });
