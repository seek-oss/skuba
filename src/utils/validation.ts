export const isFunction = (
  data: unknown,
): data is (...args: unknown[]) => Promise<unknown> =>
  typeof data === 'function';

export const isIpPort = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 65535;

export const isObject = (
  value: unknown,
): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;

export const hasProp = <P extends PropertyKey, V = unknown>(
  value: unknown,
  prop: P,
): value is Record<P, V> => isObject(value) && value.hasOwnProperty(prop);

export const hasNumberProp = <P extends PropertyKey>(
  value: unknown,
  prop: P,
): value is Record<P, number> =>
  isObject(value) && typeof value[prop] === 'number';

export const hasStringProp = <P extends PropertyKey>(
  value: unknown,
  prop: P,
): value is Record<P, string> =>
  isObject(value) && typeof value[prop] === 'string';
