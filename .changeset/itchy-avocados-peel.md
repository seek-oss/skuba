---
'skuba': minor
---

lint: Manage .npmrc files for `pnpm` installations of skuba

skuba now manages `.npmrc` files when using `pnpm` for compatibility purposes.
skuba will attempt to ignore authTokens, and remove any `.gitignore` entries that ignore `.npmrc`.
