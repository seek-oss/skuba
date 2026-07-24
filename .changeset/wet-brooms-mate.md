---
'skuba': minor
---

pkg: Migrate build tooling to tsdown

skuba is now bundled with [tsdown](https://tsdown.dev). This should not be a breaking change for most users. If you have been importing from internal paths within skuba's distribution, you may need to update those imports:

```diff
- import * as Vitest from 'skuba/lib/api/vitest/index.js';
+ import { Vitest } from 'skuba';
```
