---
'skuba': patch
---

lint: Harden `.npmrc` secret detection to prevent accidental inclusion in autofixes

Previously, the autofix guardrail only inspected and prevented commits of secrets in a `./.npmrc` file relative to the working directory. It now resolves `.npmrc` files from the Git root and checks every changed `.npmrc` in the commit, including nested paths in monorepos.
