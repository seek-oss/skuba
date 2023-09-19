---
'skuba': patch
---

template: seek-oss/docker-ecr-cache 2.1

This update brings a [new `skip-pull-from-cache` option](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin#skipping-image-pull-from-cache) which is useful on `Warm`/`Build Cache` steps.

At SEEK, our build agents no longer persist their Docker build cache from previous steps. This option allows a preparatory step to proceed on a cache hit without pulling the image from ECR, which can save on average ~1 minute per build for a 2GB Docker image.
