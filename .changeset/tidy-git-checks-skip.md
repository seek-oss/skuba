---
'skuba': patch
---

lint/test: Skip GitHub autofixes and annotations when no Git repository is available

Lint and test annotations and CI autofixes now exit with a concise warning instead of logging Git errors when the working directory has no `.git` metadata.
