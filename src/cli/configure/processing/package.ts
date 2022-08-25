import normalizeData from 'normalize-package-data';
import sortPackageJson from 'sort-package-json';

import type { PackageJson } from '../types';

import { parseObject } from './json';
import { formatPrettier } from './prettier';

export const formatPackage = (rawData: PackageJson) => {
  normalizeData(rawData);

  // we don't want to sort scripts, so make a copy to overwrite the sorted scripts
  const scripts = rawData.scripts && { ...rawData.scripts };
  const data = sortPackageJson(rawData);
  data.scripts = scripts;

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

  return formatPrettier(JSON.stringify(data), {
    filepath: 'package.json',
  });
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

export const withPackage =
  (fn: (data: PackageJson) => PackageJson) => (input: string | undefined) => {
    const inputObject = parsePackage(input);

    const outputObject = fn(inputObject ?? {});

    return formatPackage(outputObject);
  };
