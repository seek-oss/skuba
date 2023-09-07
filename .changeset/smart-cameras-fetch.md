---
'skuba': patch
---

deps: sort-package-json 2.5.1

This should resolve the following TypeScript compiler error:

```console
node_modules/@types/glob/index.d.ts(29,42): error TS2694: Namespace '"node_modules/minimatch/dist/cjs/index"' has no exported member 'IOptions'.
```
