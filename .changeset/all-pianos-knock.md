---
'skuba': minor
---

test: Upgrade skuba in CI environments

skuba will now attempt to upgrade itself when running `skuba test` in CI environments. This allows us to run [`patches`](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) in your pipelines without requiring you to manually upgrade skuba first. Please ensure you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled in order to take advantage of this feature.
