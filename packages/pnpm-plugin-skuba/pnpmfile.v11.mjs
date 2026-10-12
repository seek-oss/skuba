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
 * @satisfies {Partial<import("@pnpm/config.reader").Config>}
 */
export const defaultConfig = {
  allowBuilds,
  blockExoticSubdeps: true,
  minimumReleaseAge,
  minimumReleaseAgeExclude,
  pmOnFail: 'error',
  publicHoistPattern,
  strictDepBuilds: true,
  trustPolicy: 'no-downgrade',
  trustPolicyExclude,
};

export default createPnpmfile(defaultConfig);
