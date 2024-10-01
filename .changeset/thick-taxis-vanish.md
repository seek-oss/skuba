---
'eslint-config-skuba': major
---

ESLint 9 + `typescript-eslint` 8 + `eslint-config-seek` 14

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
