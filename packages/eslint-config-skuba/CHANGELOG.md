# eslint-config-skuba

## 6.1.0

### Minor Changes

- **deps:** eslint-config-seek 14.5.0 ([#1895](https://github.com/seek-oss/skuba/pull/1895))

## 6.0.0

### Major Changes

- **deps:** Drop support for Node.js 18.x ([#1874](https://github.com/seek-oss/skuba/pull/1874))

  Node.js 18 reached EOL in April 2025. **skuba**’s minimum supported version is now Node.js 20.9.0.

  For help upgrading projects to an LTS version of Node.js, reference the [`skuba migrate` document](https://seek-oss.github.io/skuba/docs/cli/migrate.html).

### Patch Changes

- **deps:** eslint-config-seek 14.4.0 ([#1842](https://github.com/seek-oss/skuba/pull/1842))

## 5.1.3

### Patch Changes

- **deps:** pin eslint-config-seek to 14.3.2 ([#1834](https://github.com/seek-oss/skuba/pull/1834))

  This change sets **skuba** to use a known-good version of its dependency set that doesn't clash with the use of `yarn --ignore-optional` in **skuba** projects.

  This yarn flag is not recommended by **skuba**. A future version of **skuba** will revert this change, effectively removing support for the flag.

## 5.1.2

### Patch Changes

- **deps:** eslint-config-seek ^14.3.2 ([#1830](https://github.com/seek-oss/skuba/pull/1830))

  This version pins `eslint-plugin-import-x` to an older version, due to compatibility issues with the **skuba** ecosystem.

## 5.1.1

### Patch Changes

- **deps:** eslint-config-seek ^14.3.1 ([#1822](https://github.com/seek-oss/skuba/pull/1822))

## 5.1.0

### Minor Changes

- Disable `@typescript-eslint/no-base-to-string` in tests ([#1765](https://github.com/seek-oss/skuba/pull/1765))

- **deps:** typescript-eslint 8.26 ([#1750](https://github.com/seek-oss/skuba/pull/1750))

  This bumps typescript-eslint to ^8.26.0 to support TypeScript 5.8

- Remove `eslint-plugin-tsdoc` ([#1766](https://github.com/seek-oss/skuba/pull/1766))

  This plugin is [currently incompatible](https://github.com/microsoft/tsdoc/issues/374) with our config.

- Revert to modern JavaScript language option defaults ([#1769](https://github.com/seek-oss/skuba/pull/1769))

  - `ecmaVersion: 5 => latest`
  - `sourceType: script => module`

  See [JavaScript language options](https://eslint.org/docs/latest/use/configure/language-options#specifying-javascript-options) for more information.

### Patch Changes

- Remove duplicate `@typescript-eslint` definitions ([#1766](https://github.com/seek-oss/skuba/pull/1766))

- **deps:** eslint-plugin-tsdoc ^0.4.0 ([#1749](https://github.com/seek-oss/skuba/pull/1749))

## 5.0.0

### Major Changes

- ESLint 9 + `typescript-eslint` 8 + `eslint-config-seek` 14 ([#1537](https://github.com/seek-oss/skuba/pull/1537))

  This major upgrade bundles the following changes:

  - Migration to flat config format

    See the [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide) for more information.

  - Some lint rules have been changed or renamed

    You will likely need to manually review and adjust your code after running ESLint.

  - `eslint-plugin-import` has been replaced with `eslint-plugin-import-x`

    To migrate, replace references to `eslint-plugin-import` with `eslint-plugin-import-x`, and `import/` rules with `import-x/`.

  Wider changes may be necessary if your project has a custom ESLint configuration. Refer to the following resources to get started:

  - [ESLint 9](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
  - [`typescript-eslint` 8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8)

### Minor Changes

- Disable `@typescript-eslint/only-throw-error` in test files ([#1689](https://github.com/seek-oss/skuba/pull/1689))

## 4.1.0

### Minor Changes

- **deps:** eslint-plugin-tsdoc 0.3.0 ([#1579](https://github.com/seek-oss/skuba/pull/1579))

- **deps:** @typescript/eslint ^7.14.1 ([#1596](https://github.com/seek-oss/skuba/pull/1596))

  This addresses compatibility with TypeScript 5.5

- **deps:** eslint-plugin-jest 28 ([#1538](https://github.com/seek-oss/skuba/pull/1538))

## 4.0.0

### Major Changes

- **deps:** eslint-config-seek 13 + typescript-eslint ^7.2.0 ([#1487](https://github.com/seek-oss/skuba/pull/1487))

  These major upgrades bump our minimum requirements:

  - Node.js >=18.18.0
  - ESLint >=8.56.0
  - TypeScript >=4.7.5

  See the [typescript-eslint v7 announcement](https://typescript-eslint.io/blog/announcing-typescript-eslint-v7/) for more information.
