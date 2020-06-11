---
'skuba': minor
---

**template/private-npm-package:** Add new template

The `private-npm-package` template replaces `smt init`.

This change also defaults TypeScript's `moduleResolution` to `node`.
This shouldn't break any existing consumers as it is the default resolution strategy for CommonJS.
