---
'@skuba-lib/changesets-changelog': minor
---

Migrate changelog GitHub links onto `@changesets/get-github-info` 1.0

Port `@changesets/changelog-github` 1.0 to TypeScript, including `getCommitInfo` / `getPullRequestInfo`, issue linking, `GITHUB_REPOSITORY`, templates, and `disableThanks` (on by default). Missing commits or pull requests no longer throw.
