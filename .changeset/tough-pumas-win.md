---
'skuba': major
---

**build/lint:** Update `skuba/config/tsconfig.json` [`moduleResolution`] from `node` to `node16` and [`module`] from `commonjs` to `node20`

You may notice some incompatibility issues with existing libraries. This is typically because some libraries do not offer compatible CJS types. To resolve this you can either:

1. Add a `// @ts-ignore` comment above the import statement. (These can be removed once we have fully migrated to ESM).
2. Add `skipLibCheck: true` to your `tsconfig.json` compiler options.
