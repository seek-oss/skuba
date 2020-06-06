import normalizeData from 'normalize-package-data';

import { PackageJson } from '../types';

import { formatObject, parseObject } from './json';

export const formatPackage = (data: PackageJson) => {
  normalizeData(data);

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

  return formatObject(data);
};

export const parsePackage = (
  input: string | undefined,
): PackageJson | undefined => {
  const data = parseObject(input);

  if (typeof data === 'undefined') {
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
