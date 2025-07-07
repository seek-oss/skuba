# 🤿🌊

[![npm package](https://img.shields.io/npm/v/skuba-dive?labelColor=cb0000&color=5b5b5b)](https://www.npmjs.com/package/skuba-dive)
[![Node.js version](https://img.shields.io/node/v/skuba-dive?labelColor=5fa04e&color=5b5b5b)](https://www.npmjs.com/package/skuba-dive)

Minimal runtime for [`skuba`](https://github.com/seek-oss/skuba).

## Table of contents

- [API reference](#api-reference)
  - [Assert](#assert)
  - [Env](#env)
  - [Register](#register)
- [Design](#design)

## API reference

### Assert

[TypeScript assertion functions] for narrowing down types in unit tests and the like.

These may be used for input validation in your application code at a pinch,
but consider a proper validation library with richer error handling and reporting.

[typescript assertion functions]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions

```typescript
import { Assert } from 'skuba-dive';

it('should think of a good test case name', () => {
  const result = numberOrNull();
  // result is number | null

  Assert.notNullish(result);
  // result is number
});
```

### Env

Functions for reading values out of environment variables.

For example, in your `/src/config.ts`:

```typescript
import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');
// 'dev' | 'prod'

export const port = Env.nonNegativeInteger('PORT', { default: undefined });
// number | undefined

export const version = Env.string('VERSION', { default: 'local' });
// string | 'local'

export const flag = Env.boolean('FLAG');
// boolean
```

Each function will throw if its environment variable is not set and `opts.default` is not provided.

### Register

As of July 2025, `skuba-dive/register` is replaced with native subpath imports supported by both [TypeScript](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports) and [Node.js](https://nodejs.org/api/packages.html#subpath-imports) as a part of ESM migration. This is because previously, `skuba-dive/register` relies on `module-alias` which is not compatible with ESM.

THe subpath imports feature allows us to define custom paths in our `package.json` file, enabling us to import modules using simplified paths without needing to use deep relative paths.

package.json:

```diff
{
  "name": "my-package",
+ "imports": {
+   "#src/*": {
+    "types": "./src/*", // This helps our local IDE to resolve the types
+    "import": "./lib/*",
+    "require": "./lib/*"
+   }
+ }
}
```

This will require some changes to the base skuba `tsconfig.json` and your local `tsconfig.json` files.

We will be updating our outdated [moduleResolution] configuration to `node16` and our [module] to `node18` in our `tsconfig.json` files where previously we were using the `node` resolution strategy.

```diff
{
  "compilerOptions": {
    "incremental": true,
    "isolatedModules": true,
-   "moduleResolution": "node",
+   "moduleResolution": "node16",
+   "module": "node18",
    "resolveJsonModule": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "extends": "tsconfig-seek"
}
```

In your local `tsconfig.json` file, we will also need to add a `baseUrl` and `rootDir` to help TypeScript resolve the subpath imports correctly:

```diff
{
  "compilerOptions": {
    "baseUrl": ".",
+   "rootDir": ".",
-   "paths": {
-     "#src/*": ["src/*"]
-    }
  },
  "extends": "skuba/config/tsconfig.json"
}
```

This allows us to import modules like this:

```ts
import { module } from '#src/imported-module';
```

## Design

`skuba-dive` packages up:

- General application boilerplate that doesn't justify a standalone module
- Runtime functionality that complements `skuba`

See `skuba`'s [goals] and [non-goals] for more information.

[goals]: https://seek-oss.github.io/skuba/docs/about.html#goals
[non-goals]: https://seek-oss.github.io/skuba/docs/about.html#non-goals
