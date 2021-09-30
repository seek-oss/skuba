---
"skuba": patch
---

format, lint: Limit Prettier to 25 parallel file I/O operations

This should alleviate file descriptor issues that are not handled by `graceful-fs` such as `EBADF: bad file description, close`.
