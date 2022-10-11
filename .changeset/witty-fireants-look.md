---
'skuba': major
---

build, test: Default to isolated modules

Our Jest and TypeScript presets now enable [`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) by default. Your Jest tests should start quicker, consume less resources, and no longer get stuck on pesky type errors. This should not compromise the type safety of your project as `skuba lint` is intended to type check all production and testing code.

If your project contains files without imports and exports like `jest.setup.ts`, you can add an empty export statement to them to placate the TypeScript compiler:

```console
jest.setup.ts(1,1): error TS1208: 'jest.setup.ts' cannot be compiled under '--isolatedModules' because it is considered a global script file. Add an import, export, or an empty 'export {}' statement to make it a module.
```

```diff
process.env.ENVIRONMENT = 'test';

+ export {};
```

If you previously enabled `isolatedModules` via the `globals` option in your Jest config, this is no longer functional due to syntax changes in ts-jest 29. You should be able to rely on our default going forward. `skuba configure` can attempt to clean up the stale option, or you can remove it from your `jest.config.ts` manually:

```diff
export default Jest.mergePreset({
- globals: {
-   'ts-jest': {
-     // seek-oss/skuba#626
-     isolatedModules: true,
-   },
- },
  // Rest of config
});
```

Isolated modules are incompatible with certain language features like `const enum`s. We recommend migrating away from such features as they are not supported by the broader ecosystem, including transpilers like Babel and esbuild. If your project is not yet ready for isolated modules, you can override the default in your `tsconfig.json`:

```diff
{
  "compilerOptions": {
+   "isolatedModules": false
  },
  "extends": "skuba/config/tsconfig.json"
}
```
