---
"skuba": minor
---

format, lint: Enable ESLint caching

ESLint now writes to a local `.eslintcache` store. This speeds up subsequent runs of `skuba format` and `skuba lint` as they can skip unchanged files.
