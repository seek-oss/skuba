---
parent: Development API
---

# Jest

---

## mergePreset

Merges additional Jest options into the **skuba** preset.

This concatenates array options like `testPathIgnorePatterns`.

```js
// jest.config.ts

import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],

  // This is concatenated to the end of the built-in patterns.
  testPathIgnorePatterns: ['/test\\.ts'],
});
```
