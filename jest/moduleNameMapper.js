const path = require('path');

const { pathsToModuleNameMapper } = require('ts-jest/utils');
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
    findConfigFile('.', sys.fileExists.bind(this), tsconfigName) ||
    'tsconfig.json';

  return readConfigFile(filename, sys.readFile.bind(this)).config;
};

module.exports.createModuleNameMapper = (getConfig = getConfigFromDisk) => {
  try {
    const json = getConfig();

    const parsedConfig = parseJsonConfigFileContent(json, sys, '.');

    const paths = Object.fromEntries(
      Object.entries(parsedConfig.options.paths ?? DEFAULT_PATHS).flatMap(
        ([key, values]) => [
          [
            key.replace(/\/$/, ''),
            values.map((value) => value.replace(/\/$/, '')),
          ],
          ...(key.endsWith('/*')
            ? [
                [
                  key.replace(/\/\*$/, ''),
                  values.map((value) => value.replace(/\/\*$/, '')),
                ],
              ]
            : [
                [
                  path.join(key, '*'),
                  values.map((value) => path.join(value, '*')),
                ],
              ]),
        ],
      ),
    );

    const prefix = path.join('<rootDir>', parsedConfig.options.baseUrl || '.');

    const moduleNameMapper = pathsToModuleNameMapper(paths, { prefix });

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
