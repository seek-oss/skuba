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

### 3. Jest

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

We will replace `skuba-dive/register` with subpath imports, a native solution supported by both [TypeScript] and [Node.js].

The subpath imports feature allows us to define custom paths in `package.json`, enabling us to import modules using simplified paths without needing to use deep relative paths.

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

Your local `tsconfig.json` files will require a `baseUrl` and `rootDir` to help TypeScript resolve the subpath imports correctly:

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

### 3. Switch to Vitest

Finally, we will switch to [Vitest] as our testing framework. Vitest is a modern testing framework that is fully compatible with ESM and provides a similar API to Jest, making it easier for us to transition.

We will apply a community codemod to help with the transition, but it will likely require some manual changes to our tests. Vitest also provides TypeScript support out of the box, which means we won't need to apply any custom workarounds like we do with Jest.

---

[`module`]: https://www.typescriptlang.org/tsconfig#module
[`moduleNameMapper`]: https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring
[`moduleResolution`]: https://www.typescriptlang.org/tsconfig#moduleResolution
[Node.js]: https://nodejs.org/api/packages.html#subpath-imports
[not fully compatible with ESM]: https://jestjs.io/docs/ecmascript-modules
[TypeScript]: https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports
[Vitest]: https://vitest.dev/
