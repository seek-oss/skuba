/**
 * Entry point for the Node.js development API.
 *
 * This is where skuba imports point to:
 *
 * ```typescript
 * import { Net } from 'skuba';
 *
 * const { Net } = require('skuba');
 * ```
 */

export { Buildkite, Git, GitHub, Net } from '@skuba-lib/api';

export * as Jest from './api/jest/index.js';

// evanw/esbuild#2388
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WebAssembly {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Module {}
  }
}
