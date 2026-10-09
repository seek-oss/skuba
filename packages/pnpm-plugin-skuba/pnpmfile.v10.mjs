// @ts-check

import {
  allowBuilds,
  createPnpmfile,
  minimumReleaseAge,
  minimumReleaseAgeExclude,
  publicHoistPattern,
  trustPolicyExclude,
} from './config.mjs';

/**
 * Keys are declared in alphabetical order because **skuba** writes them into
 * `pnpm-workspace.yaml` in this order.
 *
 * This is deliberately not checked against `@pnpm/config.reader`: that package
 * tracks pnpm v11, which dropped `ignorePatchFailures` and
 * `packageManagerStrictVersion`. pnpm v10 is frozen, so this config is too.
 */
export const defaultConfig = {
  allowBuilds,
  blockExoticSubdeps: true,
  ignorePatchFailures: false,
  minimumReleaseAge,
  minimumReleaseAgeExclude,
  packageManagerStrictVersion: true,
  publicHoistPattern,
  strictDepBuilds: false,
  trustPolicy: 'off',
  trustPolicyExclude,
};

export default createPnpmfile(defaultConfig);
