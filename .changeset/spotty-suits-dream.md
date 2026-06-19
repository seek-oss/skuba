---
'skuba': patch
---

lint: Remove Renovate pull request guard from autofix

skuba previously skipped pushing autofixes on Renovate branches when no open pull request was associated with the current commit, as this would interfere with Renovate's pull request creation

If you notice any issues with skuba Renovate branches stuck in an edited or blocked state, please reach out in #skuba-support.