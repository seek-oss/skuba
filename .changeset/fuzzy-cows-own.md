---
'eslint-config-skuba': minor
'skuba': minor
---

lint: Update file extension detection logic

This resolves an issue where file extensions were not being appended to imports with multiple dots in their path, such as `.vocab` files.
