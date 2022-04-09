---
'skuba': patch
---

lint, test: Set timeout for Buildkite and GitHub integrations

Transient network failures can impact annotations and autofixes. We now specify a 30 second timeout for these integration features to prevent them from hanging and indefinitely preoccupying your build agents.
