---
'skuba': minor
---

format: Commit each version's patches separately during `skuba format`

When running `skuba format`, patches are now committed individually per version rather than all at once. This provides better granularity in the git history and makes it easier to track which changes were applied by each version's patches.
