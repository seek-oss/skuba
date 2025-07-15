---
'skuba': patch
---

lint: Avoid committing unchanged git-lfs files

[Autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) on repositories using git-lfs can result in committing unchanged files, reverting lfs-tracked files to "normal" files. This is because of an underlying support for git-lfs in skuba's git library.

This change treats all git-lfs files as unchanged, and so will never be committed.
