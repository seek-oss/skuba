---
'skuba': patch
---

init: Fix `normalize-package-data` error

This fixes an error that previously occurred if you skipped the input prompt on our built-in Gantry & Lambda templates:

```console
Error: Invalid name: "@seek/<%- serviceName %>"
    at ensureValidName
```
