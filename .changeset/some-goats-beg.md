---
'@skuba-lib/api': minor
'skuba': minor
---

api: Emit a stub `Rolldown.lambdaAsset` under Vitest

When `VITEST` is `true`, the plugin replaces each entry module with a placeholder handler that throws if invoked, and skips installing `nodeModules` and copying `assets`. This lets CDK stack tests build your rolldown config and synthesise `Code.fromAsset` without first building the real bundles.

```typescript
// infra/appStack.test.ts
import { Rolldown } from 'skuba';

import config from '../rolldown.config.js';

beforeAll(() => Rolldown.build(config));
```
