---
'skuba': minor
---

test: Upgrade skuba in CI before running tests

`skuba test` applies skuba patches in CI before Vitest runs, then commits and pushes those changes when GitHub autofixes are enabled. The push still happens when the follow-up lint is clean.
