/**
 * Local hook for module alias and source map support.
 *
 * This is only intended for use with `skuba node` and `skuba start`,
 * where it is loaded before the entry point provided by the user:
 *
 * ```bash
 * ts-node --require skuba/lib/register src/userProvidedEntryPoint
 * ```
 *
 * These commands make use of development tooling like `ts-node`,
 * which may not exactly match the runtime characteristics of `node`.
 * Production code should be compiled down to JavaScript and run with Node.js.
 *
 * For equivalent module alias and source map support in production,
 * import the `skuba-dive/register` and/or `tsconfig-paths/register` hook.
 *
 * {@link https://github.com/seek-oss/skuba-dive#register}
 */

import 'source-map-support/register';

import 'tsconfig-paths/register';
