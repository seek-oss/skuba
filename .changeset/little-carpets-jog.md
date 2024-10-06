---
'skuba': patch
---

lint, format: Put back [logic](https://github.com/seek-oss/skuba/pull/1226/) which skips autofixing Renovate branches when there is no open pull request.

Previously, this was put in place to prevent an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised. This was subsequently removed because Skuba's default autofix commits [were ignored by skuba's recommended renovate configuration](https://github.com/seek-oss/rynovate/pull/121). 

However, this has resulted in some build-rebase-build-rebase-... loops, and so the [Renovate config change has been reverted](https://github.com/seek-oss/rynovate/pull/125), and requires investigation before reinstating.
