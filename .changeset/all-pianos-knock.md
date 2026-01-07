---
'skuba': minor
---

test: Upgrade skuba in CI environments

When running in CI environments, `skuba test` will now automatically attempt to upgrade skuba itself before running tests. This ensures that the latest [patches](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) are applied to your codebase without requiring manual intervention.

Ensure sure you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled to automatically commit and push these changes.
