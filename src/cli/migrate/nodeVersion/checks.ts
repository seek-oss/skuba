import { log } from '../../../utils/logging.js';
import { getConsumerManifest } from '../../../utils/manifest.js';
import type { SkubaPackageJson } from '../../init/writePackageJson.js';

export const isLikelyPackage = async (
  currentPath: string,
): Promise<boolean> => {
  const nearestPackageJsonResult = await getConsumerManifest(currentPath);
  if (!nearestPackageJsonResult) {
    log.warn('package.json not found');
    return false;
  }

  const { packageJson } = nearestPackageJsonResult;

  const type = (packageJson.skuba as SkubaPackageJson)?.type;

  if (type === 'application') {
    return false;
  }

  if (type === 'package') {
    return true;
  }

  if (typeof packageJson.sideEffects === 'boolean') {
    return true;
  }

  if (
    typeof packageJson.types === 'string' &&
    typeof packageJson.module === 'string' &&
    typeof packageJson.main === 'string'
  ) {
    return true;
  }

  if (typeof packageJson.exports === 'object') {
    return true;
  }

  if (packageJson.publishConfig) {
    return true;
  }

  if (typeof packageJson.types === 'string') {
    return true;
  }

  if (typeof packageJson.module === 'string') {
    return true;
  }

  // private true would imply this is either an internal package or application
  // either way internal packages would normally be not published or bundled in by an application within the repo
  // so we can safely assume it is a package for migration purposes
  if (packageJson.private === true) {
    return false;
  }

  return false;
};
