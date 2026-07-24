---
'skuba': patch
---

lint: Fix `.npmrc` guardrail to look at the Git root and cover nested files when checking for secrets

Previously the autofix guardrail only inspected a root-level `.npmrc` relative to the working directory. It now resolves `.npmrc` files from the Git root and checks every changed `.npmrc` in the commit (including nested ones in monorepo packages), so secret-bearing files are no longer committed and pushed.
