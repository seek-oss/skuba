// @ts-check

import { defaultConfig as pnpmV10Config } from './pnpmfile.v10.mjs';
import { defaultConfig as pnpmV11Config } from './pnpmfile.v11.mjs';
import { defaultConfig as pnpmV12Config } from './pnpmfile.v12.mjs';

/**
 * Managed `pnpm-workspace.yaml` settings, keyed by pnpm major version.
 *
 * pnpm v11 renamed and removed enough settings that a single config cannot
 * serve every major, so **skuba** picks the entry matching the pnpm version a
 * project is pinned to. pnpm v12 rejects settings it does not recognise, so
 * writing the wrong major's settings fails an install outright.
 */
export const defaultConfigs = {
  10: pnpmV10Config,
  11: pnpmV11Config,
  12: pnpmV12Config,
};

export const defaultConfig = pnpmV12Config;

export { default } from './pnpmfile.v12.mjs';
