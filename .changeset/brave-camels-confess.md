---
"skuba": patch
---

deps: ts-jest ^27.1.2

This resolves the following import issue in older 27.0.x versions of `ts-jest`:

```console
TypeError: pathsToModuleNameMapper is not a function
```
