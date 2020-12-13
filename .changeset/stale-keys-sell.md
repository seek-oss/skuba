---
'skuba': patch
---

**pkg:** Remove ESM from skuba's bundle

This simplifies our bundle; Node.js and skuba's CLI have always defaulted to CommonJS anyway.
