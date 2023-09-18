---
"skuba": patch
---

template/*: seek-oss/docker-ecr-cache 2.1

This update brings a new `skip-pull-from-cache` option which is useful on `Warm`/`Build Cache` steps.

At SEEK, the build agents no longer persist cache from previous steps, so this option allows us to proceed to the next step without needing to pull down existing cache. This can save on average ~ 1 minute, for a 2 GB Docker image size per build.
