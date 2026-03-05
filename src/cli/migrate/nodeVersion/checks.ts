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

  // private true would imply this is either an internal package or application
  if (packageJson.private === true) {
    return false;
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

  return false;
};
