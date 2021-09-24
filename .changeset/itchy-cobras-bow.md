---
"skuba": minor
---

build-package, lint: Add `--serial` flag

This explicitly disables concurrent command execution.

Propagating the `BUILDKITE` environment variable to these commands no longer constrains their concurrency. If you were relying on this behaviour to reduce resource contention on undersized Buildkite agents, update your commands to pass in the flag:

```diff
- build-package
+ build-package --serial

- lint
+ lint --serial
```

See our [Buildkite guide](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/buildkite.md) for more information.
