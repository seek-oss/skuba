---
'skuba': minor
---

**format:** Run ESLint and Prettier in process

This eliminates the overhead of spinning up separate Node.js processes. We've also been able to significantly enhance our logging output as a result, particularly when the `--debug` flag is supplied.
