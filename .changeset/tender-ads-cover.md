---
'skuba': patch
---

**template:** Propagate BUILDKITE environment variable to Docker

This forces serial execution of certain **skuba** commands to avoid overwhelming underprovisioned Buildkite agents. See [docs/buildkite.md](https://github.com/seek-oss/skuba/tree/master/docs/buildkite.md) for more information.
