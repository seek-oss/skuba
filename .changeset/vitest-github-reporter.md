---
'skuba': minor
---

test: Annotate individual test failures on GitHub check runs

`Vitest.mergePreset` now registers a reporter that creates a `skuba/test` check run per Vitest project when running in CI with a GitHub API token. Test failures are annotated against the offending lines, so they show up in the **Checks** and **Files changed** tabs of a pull request.

This restores functionality that was previously available when Jest was used as test runner.
