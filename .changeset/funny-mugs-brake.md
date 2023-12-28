---
'skuba': patch
---

Jest: Export `Config` type

This resolves a TypeScript error that could present itself when using `Jest.mergePreset` with the [`declaration`](https://www.typescriptlang.org/tsconfig#declaration) compiler option:

> TS4082: Default export of the module has or is using private name `ConfigGlobals`.
