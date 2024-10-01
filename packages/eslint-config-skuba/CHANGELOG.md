# eslint-config-skuba

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
