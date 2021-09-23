---
parent: Development API
---

# Net

---

## waitFor

Waits for a resource to start listening on a socket address.

This can be used to wait for a Docker container to start listening on its port,
as described in <https://docs.docker.com/compose/startup-order/>.

```js
// jest.config.int.js

const rootConfig = require('./jest.config');

module.exports = {
  ...rootConfig,
  globalSetup: '<rootDir>/jest.setup.int.ts',
};
```

```typescript
// jest.setup.int.ts

import { Net } from 'skuba';

module.exports = () =>
  Net.waitFor({
    host: 'composeService',
    port: 5432,
    resolveCompose: Boolean(process.env.LOCAL),
  });
```
