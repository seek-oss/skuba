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

export * as Buildkite from '@skuba-lib/api/buildkite';
export * as Git from '@skuba-lib/api/git';
export * as GitHub from '@skuba-lib/api/github';
export * as Net from '@skuba-lib/api/net';

// evanw/esbuild#2388
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WebAssembly {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Module {}
  }
}
