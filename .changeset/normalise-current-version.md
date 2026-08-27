---
'@skuba-lib/api': patch
---

api: `Cdk.normaliseTemplate` now normalises `CurrentVersion` asset hashes for any construct id, not just `worker`. Previously, Lambda version logical IDs like `notifierCurrentVersion...` were left with volatile hashes, causing cross-platform snapshot churn.
