---
parent: Deep dives
---

# Config

**skuba** configuration can be specified in an optional `skuba.config.ts` file next to your `package.json`.

```typescript
import { SkubaConfig } from 'skuba';

const config: SkubaConfig = {
  assets: [...SkubaConfig.assets.default, '**/*.adoc'],
};

export default config;
```
