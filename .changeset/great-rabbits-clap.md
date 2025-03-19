---
'skuba': minor
---

lint: Automatically remove yarn `--ignore-optional` flags

This flag is no longer templated by **skuba**, having moved to pnpm, but was in the past. The use of this flag has started causing issues with some dependencies which declare optional dependencies for different platforms when using compiled binaries, with each marked as optional (but at least one being required).

This change uses heuristics, and may not find all use, or may remove false positives; you should review the changes.
