---
'skuba': minor
---

cli: Add 30-minute timeout to skuba commands in CI to avoid potential hanging builds.

If there are use cases this breaks, please file an issue. A `SKUBA_NO_TIMEOUT` environment variable is supported on all commands to use the old behaviour. Timeout duration can be adjusted with a `SKUBA_TIMEOUT_MS` environment variable.
