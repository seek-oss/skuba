---
"skuba": minor
---

jest: Support `tsconfig.json` paths

Module aliases other than `src` are now supported in `skuba test`. Our Jest preset includes a dynamic `moduleNameMapper` that reads the `paths` compiler option from your `tsconfig.json`.
