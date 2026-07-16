---
parent: Development API
---

# Net

---

## waitFor

Waits for a resource to start listening on a socket address.

This can be used to wait for a Docker container to start listening on its port.

### Vitest

```typescript
// vitest.config.int.ts

import { Vitest } from 'skuba';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  Vitest.mergePreset({
    test: {
      globalSetup: ['vitest.setup.int.ts'],
    },
  }),
);
```

```typescript
// vitest.setup.int.ts

import { Net } from 'skuba';

export const setup = () =>
  Net.waitFor({
    host: 'composeService',
    port: 5432,
    resolveCompose: Boolean(process.env.LOCAL),
  });
```
