---
'skuba': patch
---

lint: Handle non-root working directories in autofix commits

Previously, `skuba lint` could produce surprising autofix commits if it was invoked in a directory other than the Git root. Now, it correctly evaluates its working directory in relation to the Git root, and will only commit file changes within its working directory.
