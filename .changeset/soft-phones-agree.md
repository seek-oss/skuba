---
'skuba': minor
---

Migrates internal imports to align with TypeScript 5.7's `rewriteRelativeImportExtensions` and Node.js native type stripping support, simplifying local development, REPL usage, and scripting workflows.

**Changes:**

- Adds `allowImportingTsExtensions` and `rewriteRelativeImportExtensions` to `tsconfig.json`
- Rewrites relative `.js` imports to `.ts` (e.g. `'./module.js'` → `'./module.ts'`)
- Removes `.js` extensions from `#src/` imports, since `rewriteRelativeImportExtensions` only applies to relative paths (e.g. `'#src/module.js'` → `'#src/module'`)
- Adds explicit `package.json` import mappings for `.json` files

See the [ESM deep-dive](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html#steps-to-migrate) for full migration details.
