---
'skuba': patch
---

template: Time out Buildkite test steps after 10 minutes

Successful testing and linting should complete within this window. This timeout prevents commands from hanging and indefinitely preoccupying your Buildkite agents.

```diff
steps:
  - label: 🧪 Test & Lint
+   timeout_in_minutes: 10
```
