---
'skuba': minor
---

lint/format: Skip autofixing on `renovate-skuba-` branches when there is no open pull request for the associated branch.

This prevents an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised.
