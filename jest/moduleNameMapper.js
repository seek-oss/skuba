const path = require('path');

const { pathsToModuleNameMapper } = require('ts-jest');
const {
  sys,
  findConfigFile,
  readConfigFile,
  parseJsonConfigFileContent,
} = require('typescript');

/**
 * Set a default `src` module alias for backward compatibility.
 *
 * TODO: drop this default in skuba v4.
 */
const DEFAULT_PATHS = { src: ['src'], 'src/*': ['src/*'] };

/**
 * @returns {unknown}
 */
const getConfigFromDisk = () => {
  const filename =
    // TODO: drop Node.js 12 compatibility and switch to ?? in skuba v4.
    findConfigFile('.', sys.fileExists.bind(this)) || 'tsconfig.json';

  return readConfigFile(filename, sys.readFile.bind(this)).config;
};

module.exports.createModuleNameMapper = (getConfig = getConfigFromDisk) => {
  try {
    const json = getConfig();

    const parsedConfig = parseJsonConfigFileContent(json, sys, '.');

    const paths = Object.fromEntries(
      // TODO: drop Node.js 12 compatibility and switch to ?? in skuba v4.
      Object.entries(parsedConfig.options.paths || DEFAULT_PATHS).flatMap(
        ([key, values]) => [
          // Pass through the input path entry almost verbatim.
          // We trim a trailing slash because TypeScript allows `import 'src'`
          // to be resolved by the alias `src/`, but Jest's mapper does not.
          [
            key.replace(/\/$/, ''),
            values.map((value) => value.replace(/\/$/, '')),
          ],
          // Append a variant of the input path entry.
          // As TypeScript allows both `import 'src'` and `import 'src/nested'`
          // to be resolved by the alias `src/*` (and likewise for plain `src`),
          // we need to seed two Jest mappings per path.
          ...(key.endsWith('/*')
            ? [
                [
                  // Given a path `src/*`, seed an extra `src`.
                  key.replace(/\/\*$/, ''),
                  values.map((value) => value.replace(/\/\*$/, '')),
                ],
              ]
            : [
                [
                  // Given a path `src`, seed an extra `src/*`.
                  path.join(key, '*'),
                  values.map((value) => path.join(value, '*')),
                ],
              ]),
        ],
      ),
    );

    // TODO: drop Node.js 12 compatibility and switch to ?? in skuba v4.
    const prefix = path.join('<rootDir>', parsedConfig.options.baseUrl || '.');

    const moduleNameMapper = pathsToModuleNameMapper(paths, { prefix });

    // Normalise away any `..`s that may crop up from `baseUrl` usage.
    // For example, a `baseUrl` of `src` and a path of `../cli` will result in
    // `<rootDir>/src/../cli`, which can be normalised to `<rootDir>/cli`.
    return Object.fromEntries(
      Object.entries(moduleNameMapper).map(([key, values]) => [
        key,
        Array.isArray(values)
          ? values.map((value) => path.normalize(value))
          : path.normalize(values),
      ]),
    );
  } catch {
    // Bail out here to support zero-config mode.
    return pathsToModuleNameMapper(DEFAULT_PATHS, { prefix: '<rootDir>' });
  }
};
