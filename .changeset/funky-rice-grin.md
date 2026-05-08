---
'skuba': major
---

build, lint, test: Migrate to ESM

As part of our [migration to ESM](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html), skuba's source code is now pure ESM. Its packages are still published as dual ESM/CJS at this time.

skuba will attempt to automatically transition your project to ESM and migrate your tests from Jest to Vitest. It will scaffold a new `vitest.config.ts`, but existing Jest customisations and Jest-specific libraries like `jest-dynalite` will require manual adjustment. Please ensure your project is using `skuba@15.3.0` before proceeding with this migration.

For package publishers, `skuba build-package` should handle publishing dual ESM/CJS packages automatically. **You should release this as a breaking change for your consumers.** Some build tools may behave differently when they detect `"type": "module"` in your package.json. Test your packages thoroughly after the migration to confirm everything works as expected.

Example changelog entry:

```markdown
**Breaking change:** This package is now authored as an ESM package. It is still published as a dual CJS/ESM package
```

View the [migration guide](https://seek-oss.github.io/skuba/docs/cli/migrate#skuba-migrate-esm) for more details.
