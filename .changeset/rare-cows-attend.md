---
'skuba': major
---

test: Remove default `src` module alias

Our Jest preset automatically registers your `tsconfig.json` paths as module aliases, but would previously fall back to the `src` alias if the option was omitted or failed to load. This default has now been removed.

This is not expected to affect most projects. If yours makes use of the `src` alias and its tests are now failing on imports like the following:

```typescript
import { app } from 'src/app.ts';
```

Ensure that you declare these paths in a `tsconfig.json` situated in your project root:

```diff
{
  "compilerOptions": {
+   "paths": {
+     "src": ["src"]
+   }
  },
  "extends": "skuba/config/tsconfig.json"
}
```
