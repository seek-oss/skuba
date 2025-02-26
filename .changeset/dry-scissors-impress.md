---
'skuba': minor
---

lint: Flag CODEOWNERS files that appear to have been incorrectly formatted

Some code editors incorrectly detect `CODEOWNERS` files as markdown files and re-format them as such, breaking their syntax. `skuba lint` now attempts to detect this scenario and flags the file as being incorrect.
