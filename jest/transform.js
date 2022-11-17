const { defaults } = require('ts-jest/presets');

const { tryParseTsConfig } = require('./tsConfig');

const TS_JEST_NAME = 'ts-jest';

/**
 * Resolved path of the `ts-jest` preset.
 *
 * This allows Jest to resolve the preset even if it is installed to a nested
 * `./node_modules/skuba/node_modules/ts-jest` directory.
 */
const TS_JEST_PATH = require.resolve(TS_JEST_NAME);

const maybeTsConfig = tryParseTsConfig();

// Rewrite `ts-jest` transformations using our resolved `TS_JEST_PATH`.
module.exports.transform = Object.fromEntries(
  Object.entries(defaults.transform).map(([key, value]) => {
    if (typeof value === 'string') {
      return [
        key,
        value === TS_JEST_NAME
          ? [
              TS_JEST_PATH,
              {
                isolatedModules: maybeTsConfig?.options.isolatedModules ?? true,
              },
            ]
          : value,
      ];
    }

    return [
      key,
      value[0] === TS_JEST_NAME
        ? [
            TS_JEST_PATH,
            {
              ...value[1],
              isolatedModules:
                value[1]?.isolatedModules ??
                maybeTsConfig?.isolatedModules ??
                true,
            },
          ]
        : value,
    ];
  }),
);
