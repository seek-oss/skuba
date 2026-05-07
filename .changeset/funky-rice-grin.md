---
'skuba': major
---

build, lint, test: Migrate to ESM

As part of our [migration to ESM](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html), skuba's source code is now pure ESM. Its packages are still published as dual ESM/CJS at this time.

skuba will attempt to automatically transition your project to ESM and migrate your tests from Jest to Vitest. It will scaffold a new `vitest.config.ts`, but existing Jest customisations and Jest-specific libraries like `jest-dynalite` will require manual adjustment.

For package publishers, `skuba build-package` should handle publishing dual ESM/CJS packages automatically. Test your packages thoroughly after the migration to confirm everything works as expected.

View the [migration guide](https://seek-oss.github.io/skuba/docs/cli/migrate#skuba-migrate-esm) for more details.
