---
'skuba': major
---

build, test: Default to isolated modules

Our Jest and TypeScript presets now enable [`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) by default. Your Jest tests should start quicker, consume less resources, and no longer get stuck on pesky type errors. This should not compromise the type safety of your project as `skuba lint` is intended to type check all production and testing code.

This option is incompatible with certain language features like `const enum`s. We recommend migrating away from such features as they are not supported by the broader ecosystem, including transpilers like Babel and esbuild. If your project is not yet compatible with isolated modules, you can override this default in your `tsconfig.json`:

```diff
{
  "compilerOptions": {
+   "isolatedModules": false
  },
  "extends": "skuba/config/tsconfig.json"
}
```

If you previously enabled `isolatedModules` via the `globals` option in your Jest config, this is no longer doing anything due to syntax changes in ts-jest 29. You should be able to rely on our default going forward; `skuba configure` will try to take care of this for you, otherwise you can manually remove the dead option from your `jest.config.ts`:

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
