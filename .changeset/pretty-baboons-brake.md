---
'skuba': patch
---

GitHub: Add working directory parameter to [`readFileChanges`](https://seek-oss.github.io/skuba/docs/development-api/github.html#readfilechanges)

The input `ChangedFiles` need to be evaluated against a working directory. While this is technically a breaking change, we have not found any external usage of the function in `SEEK-Jobs`.

```diff
- GitHub.readFileChanges(changedFiles)
+ GitHub.readFileChanges(dir, changedFiles)
```
