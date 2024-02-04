---
'skuba': minor
---

lint: Manage .npmrc files

skuba now manages .npmrc files with defaults intended for `pnpm` compatibility.
skuba will attempt to ignore authTokens, and remove any .gitignore entries for .npmrc.
