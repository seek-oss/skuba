---
'skuba': major
---

deps: tsconfig-seek 2

This change sets the [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) compiler option to `true` by default.

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

Unfortunately, this change is a double edged sword as your previous code which may look like this may now be invalid.

```ts
if (list.length === 3) {
  const b = list[1];
  //    ^? const b: string | undefined
}
```

To address this you will need to also explicitly check the index you are accessing.

```ts
if (list.length === 3 && list[1]) {
  const b = list[1];
  //    ^? const b: string | undefined
}
```

This may seem like overkill, however, when you consider that Javascript will also allow this it may make sense

```ts
const a: string[] = [];
a[1000] = 'foo';
console.log(a.length); // 1001
```

You can override this setting in your project's `tsconfig.json` by setting it to false.

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": false
  }
}
```
