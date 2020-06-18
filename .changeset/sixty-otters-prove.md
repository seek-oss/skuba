---
'skuba': minor
---

**jest:** skuba is now usable as a preset

```javascript
// jest.config.js

const { testPathIgnorePatterns } = require('skuba/config/jest');

module.exports = {
  // This can be used in place of ...require('skuba/config/jest')
  preset: 'skuba',

  // This is still necessary as Jest doesn't deep-merge presets
  testPathIgnorePatterns: [...testPathIgnorePatterns, '/test\\.ts'],
};
```
