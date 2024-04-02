---
'skuba': patch
---

template/\*-rest-api: Fix lint failure

This resolves the following failure on a newly-initialised project due to a regression in the `@types/express` dependency chain:

```console
error TS2688: Cannot find type definition file for 'mime'.
  The file is in the program because:
    Entry point for implicit type library 'mime'
```

A temporary workaround is to install `mime` as a dev dependency.
