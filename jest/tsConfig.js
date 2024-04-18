const {
  sys,
  findConfigFile,
  readConfigFile,
  parseJsonConfigFileContent,
} = require('typescript');

/**
 * @returns {unknown}
 */
const getTsConfigFromDisk = () => {
  const filename =
    findConfigFile('.', sys.fileExists.bind(this)) ?? 'tsconfig.json';

  return readConfigFile(filename, sys.readFile.bind(this)).config;
};

module.exports.tryParseTsConfig = (getConfig = getTsConfigFromDisk) => {
  try {
    const json = getConfig();

    return parseJsonConfigFileContent(json, sys, '.');
  } catch {
    // Bail out here to support zero-config mode.
  }
};
