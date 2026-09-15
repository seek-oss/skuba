---
parent: Development API
---

# Vitest

---

## mergePreset

Merges additional Vitest options into the **skuba** preset.

This concatenates array options like `test.coverage.exclude`.

The preset includes a reporter that creates a `skuba/test` check run per Vitest
project. Test failures are annotated against the offending lines, so they
appear in the **Checks** and **Files changed** tabs of a pull request.

The reporter does nothing unless it is running in CI with a `GITHUB_API_TOKEN`
or `GITHUB_TOKEN` on the environment, so local test runs are unaffected.

As `test.reporters` is an array option, your own reporters are concatenated
onto the preset's rather than replacing them. Pass `--reporter` to `skuba test`
if you need to override the list outright.

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
