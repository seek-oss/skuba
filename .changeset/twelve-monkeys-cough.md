---
"skuba": patch
---

build-package, lint: Limit concurrency to CPU core count

These commands can be fairly compute intensive. The concurrency limit should help to reduce load and diminishing returns in compute-constrained environments such as `t3` Buildkite agents.
