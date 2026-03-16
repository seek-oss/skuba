---
'skuba': major
---

lint, build, test: Migrate to ESM

As part of our [migration to ESM](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html), skuba's source code is now pure ESM.

skuba will attempt to automatically transition your project to ESM and migrate your tests from Jest to Vitest.

The test migration will require some manual adjustments if you were using Jest-specific libraries for features. skuba will scaffold a new Vitest config for you, but will not attempt to migrate your existing Jest config. See the [Vitest migration guide](https://vitest.dev/guide/migration.html#jest) for help with any remaining steps.

For package publishers, `tsdown` should handle publishing dual ESM/CJS packages automatically. Test your packages thoroughly after the migration to confirm everything works as expected.
