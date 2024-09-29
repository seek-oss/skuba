---
'eslint-config-skuba': major
---

Migrate to ESLint 9, `@typescript-eslint` 8, `eslint-config-seek` 14.

These changes may affect your project setup if customising your ESLint configuration. See the individual migration guides:

- https://eslint.org/docs/latest/use/migrate-to-9.0.0
- https://typescript-eslint.io/blog/announcing-typescript-eslint-v8

Through these major upgrades, some lint rules have changed or have been renamed. You will likely need to adjust your code after running ESLint.

As part of this migration, this project has migrated to Flat ESLint configuration. Read the migration: https://eslint.org/docs/latest/use/configure/migration-guide.

Furthermore, `eslint-plugin-import` has been replaced with `eslint-plugin-import-x`. To migrate, any references to `eslint-plugin-import` should be replaced with `eslint-plugin-import-x`, and `import/` rules with `import-x/`.
