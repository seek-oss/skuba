---
"skuba": minor
---

format, lint: Synchronise ignore files

`skuba format` and `skuba lint` will now keep `.eslintignore`, `.gitignore` and `.prettierignore` in sync. This automatically applies new exclusions like `.eslintcache` without the need for a manual `skuba configure`.
