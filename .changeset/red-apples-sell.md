---
'skuba': patch
---

deps: Drop `package-json`

This circumvents the [following TypeScript compilation error](https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62111) on a clean install:

```console
Error: node_modules/@types/cacheable-request/index.d.ts(0,0): error TS2709: Cannot use namespace 'ResponseLike' as a type.
```

If you run into this issue elsewhere in your project, you can temporarily work around it with a [resolution](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/) in your `package.json`:

```json
{
  "resolutions": {
    "@types/responselike": "1.0.0"
  }
}
