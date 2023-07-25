---
'skuba': minor
---

lint, format: Skip autofixing on Renovate branches when there is no open pull request

This prevents an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised.
