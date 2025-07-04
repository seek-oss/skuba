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

export * as Buildkite from './api/buildkite/index.js';
export * as Git from './api/git/index.js';
export * as GitHub from './api/github/index.js';
export * as Jest from './api/jest/index.js';
export * as Net from './api/net/index.js';

// evanw/esbuild#2388
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WebAssembly {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Module {}
  }
}
