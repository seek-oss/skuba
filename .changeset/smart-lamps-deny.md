---
'skuba': major
---

lint: Migrate `skuba build-package` usage to use [tsdown](https://tsdown.dev/) for building packages

This patch will attempt to do a best effort migration of your `skuba build-package` usage to use [tsdown](https://tsdown.dev/) for building packages. This includes:

1. Adding a `tsdown.config.mts` file to your package directories with a basic configuration
2. Adding a `customConditions` entry to your root `tsconfig.json` file
3. Adding `skipLibCheck` to your package `tsconfig.json` files to work around issues with type checking against `tsdown`.
4. Updating your package `package.json` files to point to the new build outputs
5. Removing redundant `tsconfig.build.json` files

## File changes

The output between what `skuba build-package` generates before and after this change will be different, so you may need to update any references to the output files in your project.

For example the output for a simple `src/index.ts` file produces the following outputs:

```diff
-lib-commonjs/index.js
-lib-es2015/index.js
-lib-types/index.d.ts
+lib/index.cjs
+lib/index.mjs
+lib/index.d.cts
+lib/index.d.mts
```

This change may break consumers who directly access these output paths.

To check if your consumers are affected, search GitHub with: `org:SEEK-Jobs content:"@seek/MY_PACKAGE/"`

If needed, export those references from your package entry point to help consumers migrate to the new build outputs.

Note: if you choose to remove the `unbundle: true` option from `tsdown.config.mts`, tsdown may emit bundled/chunked outputs and internal `lib/...` file paths can change between builds. Consumers should avoid importing from build output files directly, and instead import from the package entry point (or explicitly exported sub paths)

## Format changes

`tsdown` selects what ECMAScript target version to build for based on the `engines.node` field in your `package.json`.

This means that for consumers previously relying on the `lib-es2015` output may need to update their runtime to match your package's `engines.node` field.

An example changeset you may want to include for a package:

````md
---
'my-package': major
---

Update npm package build outputs

This release changes published build output paths. If you were previously importing from nested paths within the build output you will need to update imports to use the package entry point (for example, `@seek/my-package`).

```diff
-import type { SomeType } from '@seek/my-package/lib-types/...';
+import type { SomeType } from '@seek/my-package';
```
````

## Debugging

If your project utilises a `main` field which points to a `.ts` file within a monorepo setup, eg.

```json
 "main": "src/index.ts",
```

You may need to create a `moduleNameMapper` entry in your Jest config files to point to the source file, eg.

```json
{
  "moduleNameMapper": {
    "^@seek/my-package": "<rootDir>/packages/my-package/src/index.ts"
  }
}
```

This will work natively with custom conditions when we migrate to `vitest` in the future, but is required for Jest to continue working with the new build outputs.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['@seek/my-repo/source'],
    },
  },
});
```
