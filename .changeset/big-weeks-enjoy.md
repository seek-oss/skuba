---
'skuba': major
---

lint: Migrate to ESLint 9 and `@typescript-eslint` 8.

These changes may affect your project setup if customising your ESLint configuration. See the individual migration guides:

- https://eslint.org/docs/latest/use/migrate-to-9.0.0
- https://typescript-eslint.io/blog/announcing-typescript-eslint-v8

In addition, through these major upgrades, some lint rules have changed or have been renamed. You will likely need adjust your code after running ESLint.

Furthermore, `eslint-plugin-import` has been replaced with `eslint-plugin-import-x`. To migrate, any references to `eslint-plugin-import` should be replaced with `eslint-plugin-import-x`, and `import/` rules with `import-x/`.

As part of this migration, skuba has migrated to using Flat ESLint configuration. Read the migration: https://eslint.org/docs/latest/use/configure/migration-guide.

`skuba format` will attempt to migrate to flat configuration for you, where `.eslintignore` and `.eslintrc` are replaced by `eslint.config.js`.
