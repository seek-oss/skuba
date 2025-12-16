---
parent: Deep dives
---

# ESM

## What is ESM?

ESM (ECMAScript Modules) is the official standard module system for JavaScript. While our current codebases use CJS (CommonJS) modules, the module system originally introduced by Node.js, the JavaScript ecosystem is moving toward ESM as the standard.

One key challenge is that CJS and ESM are not directly compatible with each other, which makes transitioning to ESM increasingly important. The good news is that ESM provides compatibility with CJS, allowing you to use CJS modules within ESM code. Unfortunately, the reverse is not possible and you cannot use ESM modules in CJS code.

You will mostly be already familiar with the ESM syntax if you have used `import` and `export` statements in your code. At the moment our current setup instructs TypeScript to convert these ESM-style imports and exports into CJS `require` and `module.exports` statements.

## Existing challenges

There are currently three key factors that complicate a transition to ESM:

### 1. File extensions

ESM requires explicit file extensions in import statements, which is not the case with CJS. This means that we need to update all our import statements to include the correct file extensions. It may look a little unusual especially in a TypeScript codebase, but it is a requirement of ESM.

```ts
// CJS
import { module } from './imported-module';

// ESM
import { module } from './imported-module.js';
```

While this is a simple change, it requires us to update all our import statements across the codebase. It also forbids us from using the `index.js` import convention, which is commonly used in CJS.

For example, in a directory structure like this:

```text
imported-module/
├── index.js
└── other-file.js
```

We can no longer rely on implicit `index.js` resolution:

```ts
// CJS
import { module } from './imported-module';

// ESM
import { module } from './imported-module/index.js';
```

### 2. `skuba-dive/register`

Our current setup uses `skuba-dive/register` to allow us to simplify our import statements and avoid needing to use deep relative paths.

Instead of importing a module like this:

```ts
import { module } from '../../imported-module';
```

We can import it like this:

```ts
import { module } from 'src/imported-module';
```

However, `skuba-dive/register` relies on `module-alias` which is not compatible with ESM. This means that we need to find a new way to handle module aliases in ESM.

### 3. Publishing packages

We need to ensure our consumers have time to migrate to ESM before we begin releasing ESM only packages. Our current `build-package` command wraps the TypeScript compiler which does not support this [natively](https://github.com/microsoft/TypeScript/issues/54593).

### 4. Jest

Our current setup use Jest for testing, which is still [not fully compatible with ESM] as of version 30. This is a significant blocker as switching to ESM would require us to switch to a different testing framework or wait for Jest to become fully compatible with ESM.

Migrating to ESM with Jest would require significant changes to our codebase, such as updating all imports to to be dynamic imports in order to use mocks, and to change all `jest.mock` calls to use `jest.unstable_mockModule` instead.

Jest has always been a pain point for us, as we currently apply a number of custom workarounds to make it work nicely with TypeScript.

## Transitioning to ESM

We will transition to ESM over several major versions, starting with the following steps:

### 1. Add file extensions to import statements via lint rules

We will replace existing import statements to include the `.js` file extension upfront. This still works with CJS and will reduce the number of changes required when we eventually switch to ESM.

As Jest does not support file extensions in import statements, we will apply a custom [`moduleNameMapper`] which strips the file extensions when running tests.

This shouldn't cause any issues, but out of caution, we will release this as a new major version.

### 2. Replace `skuba-dive/register` with subpath imports

We will replace `skuba-dive/register` with subpath imports and custom conditions, a native solution supported by both [TypeScript] and [Node.js].

The subpath imports feature allows us to define custom paths in `package.json`, enabling us to import modules using simplified paths without needing to use deep relative paths.

package.json:

```diff
{
  "name": "@seek/my-repo",
+ "imports": {
+   "#src/*": {
+    "@seek/my-repo/source": "./src/*",
+    "default": "./lib/*",
+   }
+ }
}
```

This will require some changes to our base `skuba/config/tsconfig.json` and your local `tsconfig.json` files.

Our base `skuba/config/tsconfig.json` will update [`moduleResolution`] from `node` to `node16` and [`module`] from `commonjs` to `node20`:

```diff
{
  "compilerOptions": {
    "incremental": true,
    "isolatedModules": true,
-   "moduleResolution": "node",
+   "moduleResolution": "node16",
+   "module": "node20",
    "resolveJsonModule": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "extends": "tsconfig-seek"
}
```

Your local `tsconfig.json` files will require a `rootDir` and `customConditions` to help TypeScript resolve the subpath imports correctly:

```diff
{
  "compilerOptions": {
    "baseUrl": ".",
+   "rootDir": ".",
+   "customConditions": ["@seek/my-repo/source"],
-   "paths": {
-     "src/*": ["src/*"]
-   }
  },
  "extends": "skuba/config/tsconfig.json"
}
```

This allows us to import modules like this:

```ts
import { module } from '#src/imported-module.js';
```

We will also need to set different `rootDir` values for our local development and builds:

- **`tsconfig.json`** uses `"rootDir": "."` to ensure all TypeScript files (including `scripts/script.ts` and root-level files) can use `#src/` imports and are subject to type checking.
- **`tsconfig.build.json`** uses `"rootDir": "src"` to ensure that only source files are included in the build output.

tsconfig.build.json:

```diff
{
+ "compilerOptions": {
+   "rootDir": "src"
+ },
  "exclude": ["**/__mocks__/**/*", "**/*.test.ts", "src/testing/**/*"],
  "extends": "./tsconfig.json",
  "include": ["src/**/*"]
}
```

[Custom conditions] enable tooling to use TypeScript source files during development while automatically switching to the correct compiled outputs for deployment or publishing. This is done without additional configuration to modify package.json imports and exports. Monorepo users may already be familiar with this concept through pnpm's `publishConfig` feature. For more details, see [Live types in a TypeScript monorepo].

Unfortunately, Jest does not support custom import conditions so we will need to apply a custom [`moduleNameMapper`] to help with the transition.

#### Runtime considerations

For typical packages and back-end applications, Node.js will automatically resolve the correct files based on the `imports` field in `package.json`. Simply ensure that `package.json` is included in your deployment or published package.

If you are bundling your code (e.g. for AWS Lambda), ensure that your bundler supports the `imports` field in `package.json`. Most modern bundlers like esbuild, webpack, and Rollup support this feature but may require additional configuration.

##### AWS CDK

For AWS CDK projects, add the following `esbuildArgs` to your `NodejsFunction`:

```ts
const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
  architecture: aws_lambda.Architecture[architecture],
  runtime: aws_lambda.Runtime.NODEJS_22_X,
  memorySize: 512,
  entry: './src/app.ts',
  bundling: {
    sourceMap: true,
    target: 'node22',
    externalModules: [],
    esbuildArgs: {
      '--conditions': '@seek/my-repo/source',
    },
  },
});
```

##### Containerised workloads

For typical API workloads hosted on Automat or Gantry, simply ensure that `package.json` is included in your container image:

```diff
 COPY --from=build /workdir/lib lib
 COPY --from=build /workdir/node_modules node_modules
+COPY --from=build /workdir/package.json package.json
```

##### Serverless Framework

For Serverless projects **not** using bundling, include the `package.json` containing subpath imports within the package patterns in your `serverless.yml`:

```yml
package:
  patterns:
    - '!**'
    - 'lib/**'
    - 'package.json'
```

For Serverless projects using the native `esbuild` option, declare the conditions within the `build.esbuild` options in your `serverless.yml`:

```yml
build:
  esbuild:
    bundle: true
    minify: false
    conditions:
      - '@seek/my-repo/source'
```

For Serverless projects using `serverless-esbuild`, declare the conditions within the `custom.esbuild` options in your `serverless.yml`:

```yml
custom:
  esbuild:
    bundle: true
    minify: false
    conditions:
      - '@seek/my-repo/source'
```

For Serverless projects using `serverless-webpack`, add the following to your `webpack.config.js`:

```js
module.exports = {
  resolve: {
    conditionNames: ['@seek/my-repo/source', '...'],
  },
};
```

> **Note:** The [`'...'` syntax] preserves the default Webpack condition names.

[`'...'` syntax]: https://webpack.js.org/configuration/resolve/#resolveconditionnames

### 3. Switch to tsdown

Within `build-package` we will switch to calling [`tsdown`](https://tsdown.dev/) instead of wrapping the TypeScript compiler directly. This will allow us to continue publishing both CJS and ESM after we've migrated to ESM.

#### Create tsdown.config.mjs

```javascript
import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  exports: {
    devExports: '@seek/my-repo/source',
  },
  // TODO: Consider removing this if your package can be bundled
  unbundle: true,
});
```

#### Migrate `assets` usage

Skuba currently supports copying additional asset files during the `build-package` command via `skuba.assets` within `package.json`. As `tsdown` does not support this field, we will need to migrate these assets to use the `copy` field in `tsdown.config.mjs` instead.

```json
{
  "skuba": {
    "assets": ["**/*.vocab/*translations.json"]
  }
}
```

```diff
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  exports: {
    devExports: '@seek/my-repo/source',
  },
  // TODO: Consider removing this if your package can be bundled
  unbundle: true,
+ copy: ['**/*.vocab/*translations.json']
});
```

### 4. Switch to Vitest and ESM

Finally, we will switch to [Vitest] as our testing framework. Vitest is a modern testing framework that is fully compatible with ESM and provides a similar API to Jest, making it easier for us to transition.

We will apply the `@sku/lib/codemod` to help with the transition, but manual changes to tests will likely be required. Vitest provides TypeScript support out of the box, eliminating the need for the custom workarounds currently required with Jest.

Since Vitest is not compatible with CJS, we will switch to ESM at the same time.

#### Update package.json

Set the `type` field to `module` to enable native ESM support:

```diff
 {
   "name": "@seek/my-repo",
   "version": "13.0.2",
   "private": false,
+  "type": "module",
 }
```

#### Migrate globals

Replace CommonJS globals with ESM-compatible equivalents:

```diff
-const currentDir = __dirname;
-const currentFile = __filename;
+const currentDir = import.meta.dirname;
+const currentFile = import.meta.filename;
```

#### Migrate module syntax

Convert CommonJS-style imports and exports to ESM:

```diff
-const { module } = require('./imported-module.js');
+import { module } from './imported-module.js';

 const main = async () => {
-  const otherModule = require(`./imported-module.js`);
+  const otherModule = await import(`./imported-module.js`);
 }

-module.exports = { myFunction };
+export { myFunction };
```

#### Handle legacy CommonJS files

When `"type": "module"` is set in `package.json`, Node.js treats `.js` files as ESM modules and `.cjs` files as CommonJS modules.

If you have JavaScript files that must remain as CommonJS (e.g., configuration files for tools without ESM support), rename them with a `.cjs` extension:

```diff
-webpack.config.js
+webpack.config.cjs
```

#### Handle CommonJS named imports

Importing named exports from CommonJS dependencies may result in errors like:

```bash
tsc      │ src/framework/logging.ts(31,23): error TS2349: This expression is not callable.
tsc      │   Type 'typeof import("/workdir/indie-hirer-posting-preferences-api/node_modules/.pnpm/@seek+logger@10.0.0/node_modules/@seek/logger/lib-types/index")' has no call signatures.
```

To resolve this, convert default imports to named imports where possible:

```diff
- import createLogger from '@seek/logger';
+ import { createLogger } from '@seek/logger';
```

For other libraries, you may need to find ESM-compatible versions of the dependencies you're using.

#### Migrate to Vitest

Globals such as `it`, `describe`, and `expect`, which Jest makes available automatically, are not enabled by default in Vitest.

You will need to import these explicitly:

```diff
+import { describe, expect, it } from 'vitest';
```

For more details, see the [Vitest migration guide](https://vitest.dev/guide/migration.html#jest).

As a starting point, we will migrate your Jest imports and provide a base Vitest configuration file. However, additional manual migration will be required to get everything working.

vitest.config.ts:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['@seek/my-repo/source'],
    },
  },
  test: {
    env: {
      ENVIRONMENT: 'test',
    },
    coverage: {
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
      include: ['src'],
      exclude: ['src/testing'],
    },
    include: ['**/*.test.ts'],
  },
});
```

---

## Future considerations

TypeScript 5.7 introduced [`rewriteRelativeImportExtensions`], which allows us to rewrite relative import paths to include the `.js` file extension. When combined with [`allowImportingTsExtensions`], this would allow us to import `.ts` files directly.

Node.js also recently added [native type stripping support], which means we could start using Node.js to run TypeScript code directly without compilation.

> **Note:** This is not intended as a goal for production applications. However, it would significantly simplify local development, REPL usage, and scripting workflows.

Unfortunately, not all of our tooling is compatible with this feature yet. For example, `esbuild`, which powers our bundling and CDK deployment, is [incompatible] with this approach. We may need to wait for broader tooling support before adopting this feature.

### Steps to migrate

Once tooling support improves, we would need to update our `.js` imports to be `.ts` imports. Importing `.ts` files directly would be far more intuitive.

```diff
- import { module } from './imported-module.js';
+ import { module } from './imported-module.ts';
```

Imports beginning with `'#src/'` will need to be rewritten without extensions, as the `rewriteRelativeImportExtensions` feature only works for relative imports. This means we would need to update our `package.json` imports:

```diff
  "imports": {
    "#src/*": {
-    "@seek/my-repo/source": "./src/*",
+    "@seek/my-repo/source/*": "./src/*.ts",
-    "default": "./lib/*",
+    "default": "./lib/*.js",
    }
  }
```

We would also need to rewrite our `'#src/'` imports:

```diff
- import { module } from '#src/imported-module.js';
+ import { module } from '#src/imported-module';
```

For additional file types like `.json` files, we can add more specific import mappings to `package.json`:

```diff
  "imports": {
+   "#src/*.json": {
+     "@seek/my-repo/source": "./src/*.json",
+     "default": "./lib/*.json",
+   }
  }
```

[`allowImportingTsExtensions`]: https://www.typescriptlang.org/tsconfig#allowImportingTsExtensions
[Custom conditions]: https://www.typescriptlang.org/tsconfig/#customConditions
[incompatible]: https://github.com/evanw/esbuild/issues/2435#issuecomment-2587786458
[Live types in a TypeScript monorepo]: https://colinhacks.com/essays/live-types-typescript-monorepo
[`module`]: https://www.typescriptlang.org/tsconfig#module
[`moduleNameMapper`]: https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring
[`moduleResolution`]: https://www.typescriptlang.org/tsconfig#moduleResolution
[native type stripping support]: https://github.com/nodejs/node/releases/tag/v22.18.0
[Node.js]: https://nodejs.org/api/packages.html#subpath-imports
[not fully compatible with ESM]: https://jestjs.io/docs/ecmascript-modules
[`rewriteRelativeImportExtensions`]: https://www.typescriptlang.org/tsconfig#rewriteRelativeImportExtensions
[TypeScript]: https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports
[Vitest]: https://vitest.dev/
