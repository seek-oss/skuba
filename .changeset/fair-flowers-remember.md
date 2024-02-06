---
'skuba': minor
---

lint: always deduplicate config files

skuba has functionality to clean up redundant rules that are present in the managed section of a config file.

This change makes it so that skuba that will always deduplicate the `.gitignore`, `.prettierignore`, `.eslintignore` and `.npmrc` files in the project,
rather than only on `skuba init` / `skuba configure`.
