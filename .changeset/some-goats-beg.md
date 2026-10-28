---
'@skuba-lib/api': minor
---

api: Rolldown.lambdaAsset: Emit a stub asset when `ENVIRONMENT=test`

When `ENVIRONMENT` is `test`, the plugin replaces each entry module with a placeholder handler and skips installing `nodeModules` and copying `assets`. This lets CDK stack tests build your rolldown config and synthesise `Code.fromAsset` without first building the real bundles.

```typescript
// vitest.config.ts
export default defineConfig(
  Vitest.mergePreset({
    test: {
      env: {
        ENVIRONMENT: 'test',
      },
    },
  }),
);
```

```typescript
// infra/appStack.test.ts
import { build } from 'rolldown';

import config from '../rolldown.config.js';

beforeAll(() => build(config as BuildOptions));
```
