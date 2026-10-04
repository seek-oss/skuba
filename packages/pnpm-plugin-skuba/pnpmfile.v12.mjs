// @ts-check

import { createPnpmfile } from './config.mjs';
import { defaultConfig as pnpmV11Config } from './pnpmfile.v11.mjs';

/**
 * pnpm 12 is a rewrite in Rust that keeps pnpm 11's settings, so the managed
 * config is identical for now.
 *
 * It is still declared separately because pnpm 12 rejects a
 * `pnpm-workspace.yaml` setting it does not recognise, which makes writing the
 * wrong major's settings a hard failure rather than a silent no-op.
 *
 * @see https://pnpm.io/blog/whats-different-in-pnpm-12
 */
export const defaultConfig = { ...pnpmV11Config };

export default createPnpmfile(defaultConfig);
