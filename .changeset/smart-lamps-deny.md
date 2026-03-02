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

This may need manual adjustment depending on how your project is structured. Please reach out in #skuba-support if you need any help with this.

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
