---
'skuba': minor
---

Add 30-minute timeout to skuba commands in CI to avoid potential hanging builds.

If there are use cases this breaks, please file an issue.
The `--no-timeout` flag is supported on all commands to use the old behaviour.
Timeout duration can be adjusted with `--timeout-ms=<value>`.
