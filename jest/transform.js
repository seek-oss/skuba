const { defaults } = require('ts-jest/presets');
const { ModuleResolutionKind } = require('typescript');

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

const isolatedModules = maybeTsConfig?.options.isolatedModules ?? true;

const BROKEN_MODULE_RESOLUTIONS = new Set([
  ModuleResolutionKind.Bundler,
  ModuleResolutionKind.Node16,
  ModuleResolutionKind.NodeNext,
]);

/**
 * Passing through these module resolutions seems to break `ts-jest`.
 *
 * ```
 * error TS5110: Option 'module' must be set to 'NodeNext' when option 'moduleResolution' is set to 'NodeNext'.
 * ```
 *
 * https://github.com/kulshekhar/ts-jest/issues/4198
 */
const tsconfig = BROKEN_MODULE_RESOLUTIONS.has(
  maybeTsConfig?.options.moduleResolution,
)
  ? { tsconfig: { moduleResolution: 'Node' } }
  : undefined;

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
                ...tsconfig,
                isolatedModules,
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
              ...tsconfig,
              isolatedModules,
            },
          ]
        : value,
    ];
  }),
);
