---
'skuba': minor
---

format, lint: Remove [logic](https://github.com/seek-oss/skuba/pull/1226) to skip autofixing Renovate branches when there is no open pull request

Previously, this was put in place to prevent an issue where a Renovate branch could get stuck in an `Edited/Blocked` state without a pull request being raised.

skuba's default autofix commits are [now ignored](https://github.com/seek-oss/rynovate/pull/121) in our recommended Renovate configuration.
