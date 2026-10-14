---
'skuba': patch
---

test: Exit with a non-zero code after applying pending skuba upgrades in CI

When `skuba test` detects and applies pending skuba upgrades in CI, it now sets a non-zero exit code so the build fails
