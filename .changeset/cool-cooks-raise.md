---
'skuba': major
---

api: Delete comment when `GitHub.putIssueComment` is called with a `null` body

This can be used to have comments that are only present when there is useful information to show. This mode will only work when used in conjunction with `internalId`, for safety. See [the documentation](https://seek-oss.github.io/skuba/docs/development-api/github.html#putissuecomment) for more details.

This change is marked as breaking change because `GitHub.putIssueComment` can now return `null` according to the types.
This will only occur when `body` is `null`.
