---
'skuba': minor
---

lint: Skip generation of config files when present in `.gitignore`

`skuba lint` and `skuba format` now skip the generation of config files, like `.dockerignore` and `.npmrc`, if they are ignored by `.gitignore` files.
