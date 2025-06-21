---
parent: Deep dives
---

# ESM

## What is ESM?

ESM (ECMAScript Modules) is the official standard module system for JavaScript. While our current codebases use CJS (CommonJS) modules, the module system originally introduced by Node.js, the JavaScript ecosystem is moving toward ESM as the standard.

One key challenge is that CJS and ESM are not directly compatible with each other, which makes transitioning to ESM increasingly important. The good news is that ESM provides compatibility with CJS, allowing you to use CJS modules within ESM code. Unfortunately, the reverse is not possible and you cannot use ESM modules in CJS code.

You will mostly be already familiar with the ESM syntax if you have used `import` and `export` statements in your code. At the moment our current setup instructs TypeScript converts these imports and exports into `require` and `module.exports` statements.

## Transitioning to ESM

There are currently three key factors blocking us from transitioning to ESM:

1. **File Extensions**: ESM requires explicit file extensions in import statements, which is not the case with CJS. This means that we need to update all our import statements to include the correct file extensions. It may look a little unusual especially in a TypeScript codebase, but it is a requirement of ESM.

eg.

CJS:

```ts
import { module } from './imported-module';
```

ESM:

```ts
import { module } from './imported-module.js';
```

While this is a simple change, it requires us to update all our import statements across the codebase. It also forbids us from using the `index.js` convention, which is commonly used in CJS.

eg.

CJS:

In a filesystem like this:

```
imported-module/
  ├── index.js
  └── other-file.js
```

We could typically import the `index.js` file like this:

```ts
import { module } from './imported-module';
```

ESM:

In the same filesystem, we would need to import the `index.js` file like this:

```ts
import { module } from './imported-module/index.js';
```

1. `skuba-dive/register`: Our current setup uses `skuba-dive/register` to allow us to simplify our import statements and avoid needing to use deep relative paths.

Instead of importing a module like this:

```ts
import { module } from '../../imported-module';
```

We can import it like this:

```ts
import { module } from 'src/imported-module';
```

However, `skuba-dive/register` relies on `module-alias` which is not compatible with ESM. This means that we need to find a new way to handle module aliases in ESM.

1. **Jest** Our current setup use Jest for testing, and as of version 30 is still [not fully compatible with ESM]. This is a significant blocker as switching to ESM would require us to switch to a different testing framework or wait for Jest to become fully compatible with ESM.

Migrating to ESM with Jest would require significant changes to our codebase, such as updating all imports to to be dynamic imports in order to use mocks, and to change all `jest.mock` calls to use `jest.unstable_mockModule` instead.

Jest has always been a pain point for us, as we currently apply a number of custom workarounds to make it work nicely with TypeScript.

## Plan to transition to ESM

We will be transitioning to ESM over a few breaking releases, starting with the following steps:

1. Adding file extensions to all import statements in our codebase through lint rules.

This will replace all your existing import statements to include the `.js` file extension which will still work with our current CJS setup. This will mean there will be less changes required when we switch to ESM, as all our import statements will already include the file extensions.

As Jest does not support file extensions in import statements, we will be applying a custom [moduleNameMapper] which strips the file extensions when running tests.

This shouldn't cause any issues but out of caution we will be doing this as a breaking release.

1. Replacing `skuba-dive/register` with subpath imports

We will be replacing `skuba-dive/register` with subpath imports which is a native solution supported by both [TypeScript] and [Node.js].

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

This will require us to make some changes to our `tsconfig.json` files to ensure that TypeScript understands these paths.

```diff
{
  "compilerOptions": {
    "baseUrl": ".",
+   "rootDir": "." // This is so TypeScript can resolve the subpath imports
-   "paths": {
-     "#src/*": ["src/*"]
-    }
  }
}
```

This allows us to import modules like this:

```ts
import { module } from '#src/imported-module';
```

However, this will require us to also update our outdated [moduleResolution] configuration to `node16` and our [module] to `node18` in our `tsconfig.json` files where previously we were using the `node` resolution strategy.

1. Switching to Vitest

Finally, we will be switching to [Vitest](https://vitest.dev/) as our testing framework. Vitest is a modern testing framework that is fully compatible with ESM and provides a similar API to Jest, making it easier for us to transition. We will apply a community codemod to help with the transition, but it will still require some manual changes to our tests. Vitest also provides TypeScript support out of the box, which means we won't need to apply any custom workarounds like we do with Jest.

---

[module]: https://www.typescriptlang.org/tsconfig#module
[moduleNameMapper]: https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring
[moduleresolution]: https://www.typescriptlang.org/tsconfig#moduleResolution
[node.js]: https://nodejs.org/api/packages.html#subpath-imports
[not fully compatible with ESM]: https://jestjs.io/docs/ecmascript-modules
[typescript]: https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports
