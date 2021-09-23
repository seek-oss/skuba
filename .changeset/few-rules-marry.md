---
"skuba": minor
---

**lint:** Run ESLint and Prettier in worker threads

This reduces the number of Node.js processes spawned by `skuba lint`. We've also been able to significantly enhance our logging output as a result, particularly when the `--debug` flag is supplied.
