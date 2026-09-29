---
'skuba': minor
---

lint: Migrate default `createLogger` imports from `@seek/logger` to named imports

`skuba format` now rewrites default imports of `createLogger` from `@seek/logger` to named imports, including mixed named imports:

```diff
- import createLogger from '@seek/logger';
+ import { createLogger } from '@seek/logger';

- import createLogger, { type Logger } from '@seek/logger';
+ import { createLogger, type Logger } from '@seek/logger';
```
