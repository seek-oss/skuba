---
'skuba': minor
---

**lint:** ESM migration (`migrate/esm`): package type, CJS→ESM rewrites, globals, TypeScript exports, ESLint override, and Vitest

When skuba migrates a repo to ESM, it applies the following (in order):

- package.json: set `"type": "module"` on workspace `package.json` files where needed (with known exceptions such as `eslint-config-skuba`).
- CommonJS → ESM in configs and source: rewrite `module.exports`, `require()`, and related patterns to `export default` / `import` (including `*.config.js`, Prettier RC scripts, and matching files under `src/`).
- ESLint: where `import-x/no-default-export` is enabled, add an override so ESLint **config** files may use default exports after the rewrite above.
- Node globals: replace `__dirname` / `__filename` with `import.meta.dirname` / `import.meta.filename`, and drop redundant `const __dirname` / `const __filename` shims when present.
- TypeScript: `export =`: rewrite `export = …` to `export default …` in `.ts`, `.tsx`, `.mts`, and `.cts` (not `.d.ts`). If `import-x/no-default-export` is still on for application or library code, you may see “prefer named exports” (or similar); skuba only relaxes that rule for ESLint config files—add a targeted `files` override with `'import-x/no-default-export': 'off'` for any migrated modules that now default-export.
