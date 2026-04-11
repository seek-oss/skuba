---
'skuba': minor
---

**lint:** ESM migration (`migrate/esm`): package type, CJS→ESM rewrites, globals, TypeScript exports, ESLint override, and Vitest

When skuba migrates a repo to ESM, it applies the following (in order):

- package.json: set `"type": "module"` on workspace `package.json` files where needed (with known exceptions such as `eslint-config-skuba`).
- CommonJS → ESM in configs and source: rewrite `module.exports`, `require()`, and related patterns to `export default` / `import` (including `*.config.js`, Prettier RC scripts, and matching files under `src/`).
- ESLint: where `import-x/no-default-export` is enabled, add an override so ESLint **config** files may use default exports after the rewrite above.
- Node globals: replace `__dirname` / `__filename` with `import.meta.dirname` / `import.meta.filename`, and drop redundant `const __dirname` / `const __filename` shims when present.
- TypeScript: rewrite `export = …` to `export default …` in `.ts`, `.tsx`, `.mts`, and `.cts` (not `.d.ts`). If your `eslint.config` already sets `import-x/no-default-export` to `error` or `warn`, migrated modules that default-export may trigger “prefer named exports”. Skuba only injects a `files` override for common config globs (`*.config.js`, `.prettierrc.js`, `vitest.config.ts`, etc.); add the same rule off for any other paths that need a default export.

  Example: `export =` after migration:

  ```diff
  - export = Object.assign(app, {
  + export default Object.assign(app, {
      port: config.port,
    });
  ```

  Example: To fix `Prefer named export` error or similar, simply extend the override Skuba added with your file path.

  ```diff
       files: [
         '*.config.js',
         '.prettierrc.js',
         'vitest.config.ts',
  +      'src/app.ts',
       ],
       rules: {
         'import-x/no-default-export': 'off',
       },
  ```
