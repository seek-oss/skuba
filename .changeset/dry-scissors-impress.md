---
'skuba': minor
---

lint: Flag CODEOWNERS files that appear to have been incorrectly formatted

Some code editors occasionally incorrectly detect `CODEOWNERS` files as markdown files, and on save format them as such, breaking their syntax. skuba now attempts to detect this and flags the file as being incorrect.
