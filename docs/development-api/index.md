---
nav_order: 3
---

# Development API

**skuba** should be a `devDependency` that is excluded from your production bundle.

Its Node.js API can be used in build and test code.

## `Jest.mergePreset`

Merge additional Jest options into the **skuba** preset.

This concatenates array options like `testPathIgnorePatterns`.

```js
// jest.config.ts

import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],

  // this is concatenated to the end of the built-in patterns
  testPathIgnorePatterns: ['/test\\.ts'],
});
```

## `Net.waitFor`

Wait for a resource to start listening on a socket address.

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
