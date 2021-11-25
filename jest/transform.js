const { defaults } = require('ts-jest/presets');

const TS_JEST_NAME = 'ts-jest';

/**
 * Resolved path of the `ts-jest` preset.
 *
 * This allows Jest to resolve the preset even if it is installed to a nested
 * `./node_modules/skuba/node_modules/ts-jest` directory.
 */
const TS_JEST_PATH = require.resolve(TS_JEST_NAME);

// Rewrite `ts-jest` transformations using our resolved `TS_JEST_PATH`.
module.exports.transform = Object.fromEntries(
  Object.entries(defaults.transform).map(([key, value]) => [
    key,
    value === TS_JEST_NAME ? TS_JEST_PATH : value,
  ]),
);
