---
'skuba': minor
---

Add template for private npm packages

This change also defaults TypeScript's `moduleResolution` to `node`.
This shouldn't break any existing consumers as it is the default resolution strategy for CommonJS.
