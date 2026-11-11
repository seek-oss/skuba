---
'skuba': patch
---

lint: Explain skipped stale autofixes

When a branch has newer commits than a CI build, explain that its autofix was skipped and suggest running lint on the latest commit. Recognise native Git non-fast-forward rejections and GitHub API stale-head responses while preserving diagnostics for other failures.
