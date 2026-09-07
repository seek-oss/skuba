---
parent: Development API
---

# Vitest

---

## mergePreset

Merges additional Vitest options into the **skuba** preset.

This concatenates array options like `test.coverage.exclude`.

```typescript
// vitest.config.ts

import { Vitest } from 'skuba';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  Vitest.mergePreset({
    ssr: {
      resolve: {
        conditions: ['@seek/my-service/source'],
      },
    },
    test: {
      env: {
        ENVIRONMENT: 'test',
      },
      coverage: {
        thresholds: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        exclude: ['src/other-test-utils'],
      },
    },
  }),
);
```
