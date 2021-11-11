---
"skuba": patch
---

format, lint: Fix file descriptor warnings

This resolves the following warning when processing files that Prettier cannot parse:

```console
(node:123) Warning: File descriptor 456 closed but not opened in unmanaged mode
```
