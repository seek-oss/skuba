---
'skuba': minor
---

test: Restore GitHub check run and Buildkite annotations

`skuba test` now reports a GitHub check run and Buildkite annotation on CI, restoring behaviour lost in the skuba 16 Vitest migration.

Note: annotations will not carry meaningful detail until a future skuba release, but if you previously disabled `skuba/test` as a GitHub status check, it can be re-enabled now.