---
'skuba': patch
---

**build-package, lint:** Run serially on Buildkite

These commands now run their underlying processes serially when the `BUILDKITE` environment variable is set. This reduces the chance of resource exhaustion on smaller instance sizes but slows down builds.
