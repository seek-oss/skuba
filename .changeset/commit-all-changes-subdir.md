---
'@skuba-lib/api': patch
---

Git.commitAllChanges: Fix change filtering when `dir` is a subdirectory of the Git root

The working-directory filter compared a Git-root-relative file path against a
`dir` resolved from the current working directory, so running against a
subdirectory of the repository could skip every change and produce an empty
commit. Both paths are now resolved to absolute before comparison.
