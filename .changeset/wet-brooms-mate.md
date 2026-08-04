---
'skuba': minor
---

pkg: Migrate build tooling to tsdown

skuba is now bundled with [tsdown](https://tsdown.dev). This does not affect CLI usage nor most API usage. If your development code relied on internal `skuba` paths, update the relevant imports when they are flagged by build or lint:

```diff
- import * as Vitest from 'skuba/lib/api/vitest/index.js';
+ import { Vitest } from 'skuba';
```
