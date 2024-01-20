---
'skuba': patch
---

build: Apply trailing newlines to `skuba/config/tsconfig.json`

This aligns with Prettier 3.2 formatting behaviour. If your project references this file in a non-standard manner outside of the `tsconfig.json#/extends` field, ensure that you are using a JSONC-compatible parser.
