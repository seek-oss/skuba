import normalizeData from 'normalize-package-data';

import type { PackageJson } from '../types.js';

import { parseObject } from './json.js';
import { formatPrettier } from './prettier.js';

const normalizeDataWithoutThrowing = (rawData: PackageJson) => {
  try {
    normalizeData(rawData);
  } catch {
    // `normalize-package-data` can be picky about e.g. the `name` being valid.
    // This creates issues for partially-init-ed projects.
  }
};

export const formatPackage = async (rawData: PackageJson) => {
  normalizeDataWithoutThrowing(rawData);

  // normalize-package-data fields that aren't useful for applications

  delete rawData._id;

  if (rawData.name === '') {
    delete rawData.name;
  }

  if (rawData.readme === 'ERROR: No README data found!') {
    delete rawData.readme;
  }

  if (rawData.version === '') {
    delete rawData.version;
  }

  return formatPrettier(JSON.stringify(rawData), {
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

  normalizeDataWithoutThrowing(data);

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
