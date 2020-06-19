---
'skuba': minor
---

**eslint:** skuba is now usable as a shareable config

```javascript
// .eslintrc.js

module.exports = {
  // This can be used in place of require.resolve('skuba/config/eslint')
  extends: ['skuba'],
};
```
