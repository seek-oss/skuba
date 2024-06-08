---
'skuba': minor
---

lint: Swap out `detect-package-manager` for manual lockfile detection

`detect-package-manager` has been removed, in lieu of using `find-up` to detect the closest
`pnpm-lock.yaml` or `yarn.lock` to infer the package manager.
