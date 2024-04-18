---
parent: Development API
---

# Net

---

## waitFor

Waits for a resource to start listening on a socket address.

This can be used to wait for a Docker container to start listening on its port.

```js
// jest.config.int.ts

import { Jest } from 'skuba';

export default Jest.mergePreset({
  globalSetup: '<rootDir>/jest.setup.int.ts',
});
```

```typescript
// jest.setup.int.ts

import { Net } from 'skuba';

export default () =>
  Net.waitFor({
    host: 'composeService',
    port: 5432,
    resolveCompose: Boolean(process.env.LOCAL),
  });
```
