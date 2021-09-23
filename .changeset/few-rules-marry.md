---
"skuba": minor
---

**lint:** Run ESLint and Prettier in worker threads

This reduces the number of Node.js processes used by `skuba lint` from 4 to 2. We've also been able to significantly enhance our logging output as a result, particularly when the `--debug` flag is supplied.
