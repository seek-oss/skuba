import mergeWith from 'lodash.mergewith';

export const isArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);

export const getFirstDefined = <T>(
  record: Record<string, T | undefined>,
  keys: string[],
): T | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) {
      return value;
    }
  }

  return;
};

/**
 * Merge two objects together.
 *
 * Array properties are sorted and deduped.
 */
export const merge = <A, B>(obj: A, src: B) =>
  mergeWith({}, obj, src, (objValue: unknown, srcValue: unknown) => {
    if (isArray(objValue) && isArray(srcValue)) {
      return [...new Set(objValue.concat(srcValue))].sort();
    }

    return;
  });

/**
 * Like `merge`, but arrays are not deduped or sorted to preserve order.
 */
export const mergeRaw = <A, B>(obj: A, src: B) =>
  mergeWith({}, obj, src, (objValue: unknown, srcValue: unknown) =>
    isArray(objValue) && isArray(srcValue)
      ? objValue.concat(srcValue)
      : undefined,
  );
