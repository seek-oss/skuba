---
'@skuba-lib/changesets-changelog': minor
---

Rebase package on top of `@changesets/get-github-info` 1.0

This adds an experimental `template` option to customise the line format. Missing commits or pull requests no longer throw.

Default entries now include both the PR and the commit:

```md
- fix the thing ([#123](...) [`abc1234`](...))
```
