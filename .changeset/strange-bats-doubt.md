---
'skuba': minor
---

lint, format: Remove [logic](https://github.com/seek-oss/skuba/pull/1226/) which skips autofixing Renovate branches when there is no open pull request.

Previously, this was put in place to prevent an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised.

Skuba's default autofix commits are [now ignored by skuba's recommended renovate configuration](https://github.com/seek-oss/rynovate/pull/121).
