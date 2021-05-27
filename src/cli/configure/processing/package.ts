import normalizeData from 'normalize-package-data';

import { isObject } from '../../../utils/validation';
import { PackageJson } from '../types';

import { formatObject, parseObject } from './json';

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
  );

export const formatPackage = (data: PackageJson) => {
  normalizeData(data);

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'scripts' && isObject(value) && !Array.isArray(value)) {
      data[key] = sortRecord(value);
    }
  }

  // normalize-package-data fields that aren't useful for applications

  delete data._id;

  if (data.name === '') {
    delete data.name;
  }

  if (data.readme === 'ERROR: No README data found!') {
    delete data.readme;
  }

  if (data.version === '') {
    delete data.version;
  }

  return formatObject(data, 'package.json');
};

export const parsePackage = (
  input: string | undefined,
): PackageJson | undefined => {
  const data = parseObject(input);

  if (data === undefined) {
    return;
  }

  normalizeData(data);

  return data;
};

export const createDependencyFilter = (
  names: readonly string[],
  type: 'dependencies' | 'devDependencies',
) => {
  const set = new Set(names);

  return (data: PackageJson) => ({
    ...data,
    [type]: Object.fromEntries(
      Object.entries(data[type] ?? {}).filter(([name]) => !set.has(name)),
    ),
  });
};

export const withPackage = (fn: (data: PackageJson) => PackageJson) => (
  input: string | undefined,
) => {
  const inputObject = parsePackage(input);

  const outputObject = fn(inputObject ?? {});

  return formatPackage(outputObject);
};
