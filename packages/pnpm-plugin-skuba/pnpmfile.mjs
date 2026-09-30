// @ts-check

import { defaultConfig as pnpmV10Config } from './pnpmfile.v10.mjs';
import { defaultConfig as pnpmV11Config } from './pnpmfile.v11.mjs';

/**
 * Managed `pnpm-workspace.yaml` settings, keyed by pnpm major version.
 *
 * pnpm v11 renamed and removed enough settings that a single config cannot
 * serve both majors, so **skuba** picks the entry matching the pnpm version a
 * project is pinned to.
 */
export const defaultConfigs = {
  10: pnpmV10Config,
  11: pnpmV11Config,
};

export const defaultConfig = pnpmV11Config;

export { default } from './pnpmfile.v11.mjs';
