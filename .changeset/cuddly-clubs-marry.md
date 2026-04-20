---
'eslint-config-skuba': minor
---

Re-export `eslint-config-seek/extensions` via `eslint-config-skuba/extensions`

This allows users to import from `eslint-config-skuba/extensions` instead of needing to hoist or install `eslint-config-seek` as a direct dependency.

```ts
import {
  js as jsExtensions,
  ts as tsExtensions,
} from 'eslint-config-skuba/extensions';
```
