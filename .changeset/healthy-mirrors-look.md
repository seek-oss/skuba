---
'skuba': minor
---

deps: tsconfig-seek 2

This change sets the `noUncheckedIndexedAccess` compiler option to `true` by default.

This will flag possible issues with indexed access of arrays and records.

Before:

```ts
const a: string[] = [];
const b = a[0];
//    ^? const b: string
```

After:

```ts
const a: string[] = [];
const b = a[0];
//    ^? const b: string | undefined
```

You can override this setting in your project's `tsconfig.json` by setting it to false.

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": false
  }
}
```
