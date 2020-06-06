export const isObject = (
  value: unknown,
): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;

export const isObjectWithProp = <P extends PropertyKey>(
  value: unknown,
  prop: P,
): value is Record<P, unknown> => isObject(value) && value.hasOwnProperty(prop);
