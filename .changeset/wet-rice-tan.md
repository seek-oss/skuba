---
'skuba': minor
---

lint: Remove `baseUrl` from `tsconfig.json` files

The `baseUrl` option is deprecated in TypeScript 6.0.0. Modern skuba projects should have migrated to `#src` subpath imports in [`skuba@13.0.0`](https://github.com/seek-oss/skuba/releases/tag/skuba%4013.0.0).

This patch is safe to merge if `skuba lint` succeeds. If it fails, grep your project for aliased imports and convert them to relative or subpath imports. For example, if you have an aliased import in `src/foo.ts`:

```diff
- import { bar } from 'src/bar.js';

+ // Subpath import option
+ import { bar } from '#src/bar.js';

+ // Relative import option
+ import { bar } from './bar.js';
```
