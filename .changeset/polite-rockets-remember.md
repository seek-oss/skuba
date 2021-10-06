---
"skuba": patch
---

configure, init: Drop dependency on external Git installation

We now interface with `isomorphic-git` internally, which ensures compatibility and affords finer control over log output.
