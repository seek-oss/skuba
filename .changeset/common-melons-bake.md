---
'@skuba-lib/api': minor
---

api: Add `Rolldown.build`

This builds and writes one or more rolldown configs, as exported from a `rolldown.config.ts`. It accepts what `defineConfig` returns, including configs with multiple outputs.

```typescript
import { Rolldown } from 'skuba';

import worker1 from '../rolldown.worker1.config.js';
import worker2 from '../rolldown.worker2.config.js';

beforeAll(() => Rolldown.build([worker1, worker2]));
```

Pass `cwd` to resolve relative paths in your configs from somewhere other than `process.cwd()`:

```typescript
Rolldown.build(config, { cwd: path.join(import.meta.dirname, '..') });
```
