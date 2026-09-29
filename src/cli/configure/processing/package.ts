import normalizeData from 'normalize-package-data';
import { format } from 'oxfmt';

import type { PackageJson } from '../types.js';

import { parseObject } from './json.js';

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

  const formatResult = await format('package.json', JSON.stringify(rawData), {
    sortPackageJson: true,
  });

  return formatResult.code;
};

export const parsePackage = (
  input: string | undefined,
): PackageJson | undefined => {
  const data = parseObject(input) as PackageJson | undefined;

  if (data === undefined) {
    return;
  }

  normalizeDataWithoutThrowing(data);

  return data;
};
