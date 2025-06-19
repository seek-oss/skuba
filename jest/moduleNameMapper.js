const path = require('path');

const { pathsToModuleNameMapper } = require('ts-jest');

const { tryParseTsConfig } = require('./tsConfig');

module.exports.createModuleNameMapper = (getConfig) => {
  const maybeTsConfig = tryParseTsConfig(getConfig);

  const paths = Object.fromEntries(
    Object.entries(maybeTsConfig?.options.paths ?? {}).flatMap(
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

  const prefix = path.join('<rootDir>', maybeTsConfig?.options.baseUrl ?? '.');

  const moduleNameMapper = pathsToModuleNameMapper(paths, {
    prefix,
    useESM: true,
  });

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
};
