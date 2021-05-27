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
 * import the `skuba-dive/register` hook.
 *
 * {@link https://github.com/seek-oss/skuba-dive#register}
 */

import 'source-map-support/register';

import path from 'path';

import { addAlias } from 'module-alias';
import readPkgUp from 'read-pkg-up';

import { log } from './utils/logging';

const registerModuleAliases = () => {
  if (!process.env.__SKUBA_REGISTER_MODULE_ALIASES) {
    return;
  }

  // This may pick the wrong `package.json` if we are in a nested directory.
  // Consider revisiting this when we decide how to better support monorepos.
  const result = readPkgUp.sync();

  if (result === undefined) {
    log.warn(log.bold('src'), '→', 'not found');

    return;
  }

  const root = path.dirname(result.path);
  const src = path.join(root, 'src');

  log.subtle(log.bold('src'), '→', src);

  addAlias('src', src);
};

registerModuleAliases();
