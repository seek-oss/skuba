---
'skuba': patch
---

build, build-package, test: Remove empty export synthesis for Jest setup files

[`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) was enabled by default in [v5.0.0](https://github.com/seek-oss/skuba/releases/tag/v5.0.0). To ease this migration, the commands listed above were updated to dynamically synthesise an empty export for `jest.setup.ts` and `jest.setup.int.ts` files; this compatibility logic has now been removed.

Up-to-date projects are unlikely to be affected, but you can easily add an empty export statement to placate the TypeScript compiler:

```console
jest.setup.ts(1,1): error TS1208: 'jest.setup.ts' cannot be compiled under '--isolatedModules' because it is considered a global script file. Add an import, export, or an empty 'export {}' statement to make it a module.
```

```diff
process.env.ENVIRONMENT = 'test';

+ export {};
```
